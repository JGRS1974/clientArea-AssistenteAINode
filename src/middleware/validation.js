const Joi = require('joi');

const validateChatRequest = (req, res, next) => {
  const schema = Joi.object({
    text: Joi.string().min(1).max(1000).required(),
    conversation_id: Joi.string().uuid().allow(null, '').optional(),
    type: Joi.string().valid('text', 'audio', 'image').default('text')
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.details.map(d => d.message)
    });
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