const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const assistantRoutes = require('./routes/assistant');
const boletoRoutes = require('./routes/boleto');
const { connectRedis, getRedisClient } = require('./config/redis');
const { loadPins, generatePin } = require("./utils/pinGenerator");
const { ticket_lookup } = require("./tools/ticketTool");
const { card_lookup } = require("./tools/cardTool");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/assistant', assistantRoutes);
app.use('/api/boleto', boletoRoutes);

// Users Pin
(async () => {
  await loadPins(); // carrega e já limpa expirados
})();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Corpe Assistant API'
  });
});

// Redis test
app.get('/test-redis', async (req, res) => {
  try {
    const client = getRedisClient();
    await client.set('teste', 'funcionando!', { EX: 10 }); // expira em 10s
    const value = await client.get('teste');
    res.json({ success: true, value });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test users pin
app.post("/pin", async (req, res) => {
  try {
    const pin = await generatePin(req.body.cpf);
    res.json({ pin });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Test boleto
app.post("/boleto", async (req, res) => {
  try {
    const response = await ticket_lookup(req.body.cpf);
    res.json({ response });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Test carteirinha
app.post("/card", async (req, res) => {
  try {
    const cpf = req.body.cpf;
    const kw = req.get("kw"); // pega o header chamado "kw"
    
    const response = await card_lookup(cpf, kw);
    res.json({ response });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});


// Initialize Redis connection and start server
async function startServer() {
  try {
    await connectRedis();
    console.log('✅ Redis conectado com sucesso');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
