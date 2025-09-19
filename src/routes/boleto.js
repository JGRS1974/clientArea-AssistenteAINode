const express = require('express');
const router = express.Router();

const { getCachedBoletoPdf } = require('../tools/ticketTool');

router.get('/download/:token', (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Token é obrigatório.' });
  }

  try {
    const pdfBase64 = getCachedBoletoPdf(token);

    if (!pdfBase64) {
      return res.status(404).json({ error: 'Boleto não encontrado ou link expirado.' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="boleto-${token}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    return res.send(pdfBuffer);
  } catch (error) {
    console.error(`[BOLETO ROUTE] Erro ao gerar download do token ${token}:`, error);
    return res.status(500).json({ error: 'Não foi possível gerar o download do boleto.' });
  }
});

module.exports = router;
