const multer = require('multer');
const { sendAssistantResponse } = require('../utils/assistantResponse');

const storage = multer.memoryStorage();

const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
const ALLOWED_FILE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    files: 3
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      if (ALLOWED_AUDIO_MIMES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Áudio em formato não suportado. Use MP3, WAV, OGG ou WEBM.'));
    }

    if (file.fieldname === 'file') {
      if (ALLOWED_FILE_MIMES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Arquivo em formato não suportado. Use JPEG, PNG, PDF, DOC, DOCX ou TXT.'));
    }

    return cb(new Error('Campo de arquivo não suportado.'), false);
  }
});

const chatFields = upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

const formatUploadErrorMessage = (error) => {
  if (!error) {
    return 'Não consegui ler o arquivo enviado. Tente novamente com um formato válido.';
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return 'O arquivo enviado é maior que 10 MB. Envie um arquivo menor, por favor.';
    }

    return 'Não consegui processar o arquivo enviado. Tente novamente ou utilize outro arquivo.';
  }

  const message = error.message || '';

  if (message.includes('Áudio em formato não suportado')) {
    return 'Não consegui ler o áudio enviado. Aceito arquivos MP3, WAV, OGG ou WEBM.';
  }

  if (message.includes('Arquivo em formato não suportado')) {
    return 'Não consegui abrir o arquivo enviado. Use JPEG, PNG, PDF, DOC, DOCX ou TXT.';
  }

  if (message.includes('Campo de arquivo não suportado')) {
    return 'Recebi um campo de arquivo que não reconheço. Envie o áudio em "audio" ou arquivos em "file".';
  }

  return 'Não consegui ler o arquivo enviado. Tente novamente com um formato compatível.';
};

module.exports = (req, res, next) => {
  chatFields(req, res, (err) => {
    if (err) {
      const friendlyMessage = formatUploadErrorMessage(err);
      return sendAssistantResponse(res, friendlyMessage, req.body?.conversation_id || null);
    }

    next();
  });
};
