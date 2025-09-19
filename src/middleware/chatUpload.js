const multer = require('multer');

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_AUDIO_MIMES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
const ALLOWED_DOCUMENT_MIMES = [
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
    if (file.fieldname === 'image') {
      if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Imagem em formato não suportado. Use JPEG ou PNG.'));
    }

    if (file.fieldname === 'audio') {
      if (ALLOWED_AUDIO_MIMES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Áudio em formato não suportado. Use MP3, WAV, OGG ou WEBM.'));
    }

    if (file.fieldname === 'document') {
      if (ALLOWED_DOCUMENT_MIMES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Documento em formato não suportado. Use PDF, DOC, DOCX ou TXT.'));
    }

    return cb(new Error('Campo de arquivo não suportado.'), false);
  }
});

const chatFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]);

module.exports = (req, res, next) => {
  chatFields(req, res, (err) => {
    if (err) {
      const statusCode = err instanceof multer.MulterError ? 400 : 400;
      return res.status(statusCode).json({
        error: err.message
      });
    }

    next();
  });
};
