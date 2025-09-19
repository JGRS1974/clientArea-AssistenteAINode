const express = require('express');
const router = express.Router();

const { validateChatRequest, validateImageUpload } = require('../middleware/validation');
const upload = require('../middleware/upload');
const chatUpload = require('../middleware/chatUpload');
const { processUserMessage, processImageMessage } = require('../services/openai');
const { transcribeAudioFile, analyzeImageForCpf, analyzeDocumentForCpf } = require('../services/mediaProcessor');
const { extractCpfsFromText, formatCpf } = require('../utils/cpf');
const { getTimeOfDayGreeting } = require('../utils/greeting');
const { createConversationId, saveMessage, getConversation, formatMessagesForOpenAI } = require('../services/conversation');


// Endpoint para chat via texto
router.post('/chat', chatUpload, validateChatRequest, async (req, res) => {
  try {
    const { text, conversation_id, type } = req.body;
    const kw = req.get("kw") || null;
    const files = req.files || {};

    const audioFile = Array.isArray(files.audio) && files.audio.length ? files.audio[0] : null;
    const imageFile = Array.isArray(files.image) && files.image.length ? files.image[0] : null;
    const documentFile = Array.isArray(files.document) && files.document.length ? files.document[0] : null;

    // Se não tem conversationId, cria uma nova id de conversa
    const conversationId = conversation_id || createConversationId();

    // Recupera conversa existente
    const conversation = await getConversation(conversationId);
    const isFirstAssistantTurn = !conversation.some(message => message.role === 'assistant');
    const messages = formatMessagesForOpenAI(conversation);

    const metadata = { type };
    const messageSegments = [];
    const aggregatedCpfs = new Set();

    const pushCpfs = (cpfs) => {
      if (Array.isArray(cpfs)) {
        cpfs.forEach((cpf) => {
          if (typeof cpf === 'string' && cpf.length === 11) {
            aggregatedCpfs.add(cpf);
          }
        });
      }
    };

    const appendSegment = (segment) => {
      if (segment && segment.trim().length > 0) {
        messageSegments.push(segment.trim());
      }
    };

    if (audioFile) {
      metadata.audio = {
        originalName: audioFile.originalname,
        mimeType: audioFile.mimetype,
        size: audioFile.size
      };

      try {
        const { text: transcription, cpfs } = await transcribeAudioFile(audioFile);
        metadata.audio.transcription = transcription;
        pushCpfs(cpfs);

        if (transcription) {
          appendSegment(`Transcrição do áudio (${audioFile.originalname}): ${transcription}`);
        } else {
          appendSegment(`Arquivo de áudio (${audioFile.originalname}) recebido, mas nenhuma transcrição pôde ser gerada.`);
        }
      } catch (error) {
        console.error('[CHAT] Erro ao transcrever áudio:', error);
        metadata.audio.error = error.message;
        appendSegment(`Não foi possível transcrever o áudio ${audioFile.originalname}.`);
      }
    }

    if (imageFile) {
      metadata.image = {
        originalName: imageFile.originalname,
        mimeType: imageFile.mimetype,
        size: imageFile.size
      };

      try {
        const analysis = await analyzeImageForCpf(imageFile);
        metadata.image.notes = analysis.notes;
        metadata.image.cpfs = analysis.cpfs;
        pushCpfs(analysis.cpfs);

        if (analysis.cpfs.length) {
          const formatted = analysis.cpfs.map(formatCpf).join(', ');
          appendSegment(`Imagem ${imageFile.originalname} analisada. CPF(s) identificado(s): ${formatted}.`);
        } else {
          appendSegment(`Imagem ${imageFile.originalname} analisada. Nenhum CPF identificado.`);
        }
      } catch (error) {
        console.error('[CHAT] Erro ao analisar imagem:', error);
        metadata.image.error = error.message;
        appendSegment(`Não foi possível analisar a imagem ${imageFile.originalname} para detectar CPF.`);
      }
    }

    if (documentFile) {
      metadata.document = {
        originalName: documentFile.originalname,
        mimeType: documentFile.mimetype,
        size: documentFile.size
      };

      try {
        const analysis = await analyzeDocumentForCpf(documentFile);
        metadata.document.cpfs = analysis.cpfs;
        pushCpfs(analysis.cpfs);

        if (analysis.text) {
          metadata.document.preview = analysis.text.slice(0, 500);
        }

        if (analysis.cpfs.length) {
          const formatted = analysis.cpfs.map(formatCpf).join(', ');
          appendSegment(`Documento ${documentFile.originalname} analisado. CPF(s) identificado(s): ${formatted}.`);
        } else {
          appendSegment(`Documento ${documentFile.originalname} analisado. Nenhum CPF identificado.`);
        }
      } catch (error) {
        console.error('[CHAT] Erro ao analisar documento:', error);
        metadata.document.error = error.message;
        appendSegment(`Não foi possível analisar o documento ${documentFile.originalname}.`);
      }
    }

    if (typeof text === 'string' && text.trim().length > 0) {
      const trimmed = text.trim();
      appendSegment(trimmed);
      pushCpfs(extractCpfsFromText(trimmed));
    }

    if (!messageSegments.length) {
      if (audioFile && imageFile) {
        appendSegment('[Áudio e imagem enviados]');
      } else if (audioFile) {
        appendSegment('[Áudio enviado]');
      } else if (imageFile) {
        appendSegment('[Imagem enviada]');
      } else if (documentFile) {
        appendSegment('[Documento enviado]');
      } else {
        appendSegment('[Mensagem vazia]');
      }
    }

    if (aggregatedCpfs.size) {
      const formattedCpfs = Array.from(aggregatedCpfs).map(formatCpf);
      appendSegment(`CPF(s) detectado(s) nesta mensagem: ${formattedCpfs.join(', ')}.`);
      metadata.cpfs = Array.from(aggregatedCpfs);
      metadata.cpfsFormatted = formattedCpfs;
    }

    const userMessageContent = messageSegments.join('\n\n');

    messages.push({ role: 'user', content: userMessageContent });

    // Salva mensagem do usuário
    await saveMessage(conversationId, 'user', userMessageContent, metadata);

    if (isFirstAssistantTurn && aggregatedCpfs.size === 0) {
      const greeting = getTimeOfDayGreeting();
      const assistantReply = `Olá, ${greeting}! Por favor, informe seu CPF (apenas números) para consulta. Obrigada.`;

      await saveMessage(conversationId, 'assistant', assistantReply, {
        type: 'auto_greeting',
        greeting
      });

      return res.json({
        text: assistantReply,
        conversation_id: conversationId
      });
    }

    // Processa mensagem com OpenAI
    const result = await processUserMessage(messages, kw);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Salva resposta da IA
    await saveMessage(conversationId, 'assistant', result.response);

    res.json({
      text: result.response,
      conversation_id: conversationId,
    });

  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Endpoint para upload de imagem
router.post('/image', upload.single('image'), validateImageUpload, async (req, res) => {
  try {
    const { conversation_id } = req.body;
    const { buffer, mimetype } = req.file;

    // Se não tem sessionId, cria uma nova sessão
    const conversationId = conversation_id || createConversationId();

    // Processa imagem com OpenAI Vision
    const result = await processImageMessage(buffer, mimetype, kwKey);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    // Salva mensagem de imagem
    await saveMessage(currentSessionId, 'user', '[Imagem enviada]', { 
      type: 'image',
      mimetype
    });

    // Salva resposta da IA
    await saveMessage(currentSessionId, 'assistant', result.response, {
      type: 'image_response'
    });

    res.json({
      success: true,
      sessionId: currentSessionId,
      response: result.response,
      metadata: {
        type: 'image_processed',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro no processamento de imagem:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
