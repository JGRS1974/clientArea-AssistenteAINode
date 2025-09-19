const express = require('express');
const router = express.Router();

const { validateChatRequest, validateKwHeader, validateImageUpload } = require('../middleware/validation');
const upload = require('../middleware/upload');
const { processUserMessage, processImageMessage } = require('../services/openai');
const { createConversationId, saveMessage, getConversation, formatMessagesForOpenAI, clearConversation } = require('../services/conversation');


// Endpoint para criar nova id de conversa
//router.post('/session', validateKwHeader, async (req, res) => {
//  try {
//    const conversationId = createConversationId();
//    
//    res.json({
//      status: true,
//      conversationId
//    });
//  } catch (error) {
//    console.error('Erro ao criar o id da conversa:', error);
//    res.status(500).json({
//      success: false,
//      error: 'Erro interno do servidor'
//    });
//  }
//});

// Endpoint para chat via texto
router.post('/chat', validateChatRequest, async (req, res) => {
  try {
    const { text, conversation_id } = req.body;
    const kw = req.get("kw") || null;

    // Se não tem conversationId, cria uma nova id de conversa
    const conversationId = conversation_id || createConversationId();

    // Recupera conversa existente
    const conversation = await getConversation(conversationId);
    const messages = formatMessagesForOpenAI(conversation);

    // Adiciona nova mensagem do usuário
    messages.push({ role: 'user', content: text });

    // Salva mensagem do usuário
    await saveMessage(conversationId, 'user', text, { type: 'text' });

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

// Endpoint para recuperar histórico da conversa
//router.get('/conversation/:conversationId', validateKwHeader, async (req, res) => {
//  try {
//    const { sessionId } = req.params;
//    
//    if (!sessionId) {
//      return res.status(400).json({
//        success: false,
//        error: 'SessionId é obrigatório'
//      });
//    }
//
//    const conversation = await getConversation(sessionId);
//
//    res.json({
//      success: true,
//      sessionId,
//      messages: conversation,
//      count: conversation.length
//    });
//
//  } catch (error) {
//    console.error('Erro ao recuperar conversa:', error);
//    res.status(500).json({
//      success: false,
//      error: 'Erro interno do servidor'
//    });
//  }
//});

// Endpoint para limpar conversa
//router.delete('/conversation/:sessionId', validateKwHeader, async (req, res) => {
//  try {
//    const { sessionId } = req.params;
//    
//    if (!sessionId) {
//      return res.status(400).json({
//        success: false,
//        error: 'SessionId é obrigatório'
//      });
//    }
//
//    const cleared = await clearConversation(sessionId);
//
//    if (cleared) {
//      res.json({
//        success: true,
//        message: 'Conversa limpa com sucesso'
//      });
//    } else {
//      res.status(500).json({
//        success: false,
//        error: 'Erro ao limpar conversa'
//      });
//    }
//
//  } catch (error) {
//    console.error('Erro ao limpar conversa:', error);
//    res.status(500).json({
//      success: false,
//      error: 'Erro interno do servidor'
//    });
//  }
//});

module.exports = router;