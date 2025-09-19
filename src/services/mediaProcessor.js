const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { toFile } = require('openai');

const { openai } = require('../config/openai');
const { extractCpfsFromText, sanitizeCpf } = require('../utils/cpf');

async function transcribeAudioFile(file) {
  const fileLike = await toFile(file.buffer, file.originalname || 'audio', {
    type: file.mimetype || 'audio/mpeg'
  });

  const transcription = await openai.audio.transcriptions.create({
    file: fileLike,
    model: 'whisper-1',
    response_format: 'json',
    language: 'pt' // força o processamento em português
  });

  const text = (transcription.text || '').trim();
  const cpfs = extractCpfsFromText(text);

  return {
    text,
    cpfs
  };
}

async function analyzeImageForCpf(file) {
  const base64Image = file.buffer.toString('base64');

  const systemPrompt = 'Você é um assistente que extrai números de CPF de imagens de documentos brasileiros. Retorne JSON válido.';
  const userInstruction = 'Analise a imagem fornecida e responda APENAS com um JSON no formato {"cpfs": ["00000000000"], "notes": "descrição curta"}. Se não houver CPF, use uma lista vazia e explique em notes.';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    temperature: 0,
    max_tokens: 400,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userInstruction },
          {
            type: 'image_url',
            image_url: {
              url: `data:${file.mimetype};base64,${base64Image}`
            }
          }
        ]
      }
    ]
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';

  let parsed = { cpfs: [], notes: content };

  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const cpfs = extractCpfsFromText(content);
    parsed = {
      cpfs,
      notes: content
    };
  }

  const cpfsDigits = Array.isArray(parsed.cpfs)
    ? parsed.cpfs.map(sanitizeCpf).filter((cpf) => cpf.length === 11)
    : [];

  return {
    cpfs: cpfsDigits,
    raw: content,
    notes: typeof parsed.notes === 'string' ? parsed.notes : ''
  };
}

async function extractTextFromDocument(file) {
  switch (file.mimetype) {
    case 'application/pdf': {
      const { text } = await pdfParse(file.buffer);
      return text || '';
    }
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const { value } = await mammoth.extractRawText({ buffer: file.buffer });
      return value || '';
    }
    case 'text/plain':
      return file.buffer.toString('utf8');
    default:
      throw new Error(`Formato de documento não suportado: ${file.mimetype}`);
  }
}

async function analyzeDocumentForCpf(file) {
  const textContent = (await extractTextFromDocument(file)).trim();
  const cpfs = extractCpfsFromText(textContent);

  return {
    cpfs,
    text: textContent
  };
}

module.exports = {
  transcribeAudioFile,
  analyzeImageForCpf,
  analyzeDocumentForCpf,
  extractTextFromDocument
};
