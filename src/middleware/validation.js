const Joi = require('joi');

const validateChatRequest = (req, res, next) => {
  const schema = Joi.object({
    text: Joi.string().allow('', null).max(1000).optional(),
    conversation_id: Joi.string().uuid().allow(null, '').optional(),
    type: Joi.string().valid('text', 'audio', 'image', 'document').optional()
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

  if (error) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.details.map(d => d.message)
    });
  }

  const hasText = typeof value.text === 'string' && value.text.trim().length > 0;
  const hasAudio = Array.isArray(req.files?.audio) && req.files.audio.length > 0;
  const hasImage = Array.isArray(req.files?.image) && req.files.image.length > 0;
  const hasDocument = Array.isArray(req.files?.document) && req.files.document.length > 0;

  if (!hasText && !hasAudio && !hasImage && !hasDocument) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: ['Informe pelo menos texto, áudio, imagem ou documento.']
    });
  }

  if (!value.type) {
    if (hasAudio) {
      value.type = 'audio';
    } else if (hasImage) {
      value.type = 'image';
    } else if (hasDocument) {
      value.type = 'document';
    } else {
      value.type = 'text';
    }
  }

  if (value.type === 'audio' && !hasAudio) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: ['Envie um arquivo de áudio para requests do tipo áudio.']
    });
  }

  if (value.type === 'image' && !hasImage) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: ['Envie uma imagem para requests do tipo imagem.']
    });
  }

  if (value.type === 'document' && !hasDocument) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: ['Envie um documento para requests do tipo documento.']
    });
  }

  if (value.type === 'text' && !hasText) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: ['Campo de texto é obrigatório para requests do tipo texto.']
    });
  }

  if (hasText) {
    value.text = value.text.trim();
  } else {
    value.text = '';
  }

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
