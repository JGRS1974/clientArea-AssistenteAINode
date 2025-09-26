const Joi = require('joi');
const { sendAssistantResponse } = require('../utils/assistantResponse');

const validateChatRequest = (req, res, next) => {
  const schema = Joi.object({
    text: Joi.string().allow('', null).max(1000).optional(),
    conversation_id: Joi.string().uuid().allow(null, '').optional(),
    type: Joi.string().valid('text', 'audio', 'file', 'image', 'document').optional()
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  const conversationId = req.body?.conversation_id || null;

  if (error) {
    return sendAssistantResponse(
      res,
      'Não consegui entender sua mensagem. Verifique os campos enviados e tente novamente.',
      conversationId
    );
  }

  const hasText = typeof value.text === 'string' && value.text.trim().length > 0;
  const hasAudio = Array.isArray(req.files?.audio) && req.files.audio.length > 0;
  const hasFile = Array.isArray(req.files?.file) && req.files.file.length > 0;

  if (!hasText && !hasAudio && !hasFile) {
    return sendAssistantResponse(
      res,
      'Não encontrei nenhum conteúdo para analisar. Envie texto, um áudio ou um arquivo válido para eu continuar.',
      conversationId
    );
  }

  if (value.type === 'image' || value.type === 'document') {
    value.type = 'file';
  }

  if (!value.type) {
    if (hasAudio) {
      value.type = 'audio';
    } else if (hasFile) {
      value.type = 'file';
    } else {
      value.type = 'text';
    }
  }

  if (value.type === 'audio' && !hasAudio) {
    return sendAssistantResponse(
      res,
      'Não localizei o arquivo de áudio. Envie o áudio em MP3, WAV, OGG ou WEBM para eu ouvir.',
      conversationId
    );
  }

  if (value.type === 'file' && !hasFile) {
    return sendAssistantResponse(
      res,
      'Não encontrei o arquivo enviado. Aceito documentos em PDF, DOC, DOCX, TXT ou imagens JPEG/PNG.',
      conversationId
    );
  }

  if (value.type === 'text' && !hasText) {
    return sendAssistantResponse(
      res,
      'Você escolheu enviar texto, mas o campo chegou vazio. Escreva sua mensagem para que eu consiga ajudar.',
      conversationId
    );
  }

  value.text = hasText ? value.text.trim() : '';

  req.body = value;
  
  next();
};

const validateKwHeader = (req, res, next) => {
  const kw = req.headers['kw'];

  if (!kw) {
    return res.status(401).json({
      error: 'Chave de acesso KW não fornecida'
    });
  }

  req.kw = kw;
  next();
};

const validateImageUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'Nenhuma imagem foi enviada'
    });
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedMimes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: 'Formato de imagem não suportado. Use JPEG ou PNG.'
    });
  }

  // Limite de 5MB
  const maxSize = 5 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({
      error: 'Imagem muito grande. Tamanho máximo: 5MB'
    });
  }

  next();
};

module.exports = {
  validateChatRequest,
  validateKwHeader,
  validateImageUpload
};
