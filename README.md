# Corpe Assistant API

Assistente virtual da Corpe para consulta de boletos e carteirinhas usando OpenAI GPT-4.1.

## Características

- ✅ Integração com OpenAI GPT-4.1
- ✅ Consulta de boletos em aberto via API da Corpe
- ✅ Consulta de informações da carteirinha
- ✅ Suporte a texto, áudio e imagem (extração de CPF de documentos)
- ✅ Persistência das últimas 50 conversas no Redis
- ✅ Sistema de sessões com UUID
- ✅ Validação de chave de acesso KW
- ✅ Upload de imagens para extração de CPF
- ✅ Middleware de validação e tratamento de erros

## Pré-requisitos

- Node.js >= 16.0.0
- Redis Server
- Chave API da OpenAI
- Acesso às APIs da Corpe

## Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd corpe-assistant
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```bash
# Configurações do servidor
PORT=3000
NODE_ENV=production

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# APIs da Corpe
CORPE_API_BASE_URL=https://api.corpe.com.br
CORPE_BOLETOS_ENDPOINT=/api/v1/boletos
CORPE_CARTEIRINHA_ENDPOINT=/api/v1/carteirinha

# Sistema
CONVERSATION_LIMIT=50
```

4. **Inicie o Redis (se usando localmente)**
```bash
redis-server
```

5. **Execute o projeto**
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## Endpoints da API

### 1. Health Check
```
GET /health
```

### 2. Criar Nova Sessão
```
POST /api/assistant/session
Headers: x-kw-key: <chave-de-acesso>
```

### 3. Chat por Texto
```
POST /api/assistant/chat
Headers: x-kw-key: <chave-de-acesso>
Body: {
  "message": "Quero consultar meus boletos",
  "sessionId": "uuid-da-sessao" // opcional
}
```

### 4. Upload de Imagem
```
POST /api/assistant/image
Headers: x-kw-key: <chave-de-acesso>
Body: FormData com campo "image" e "sessionId" (opcional)
```

### 5. Recuperar Histórico
```
GET /api/assistant/conversation/:sessionId
Headers: x-kw-key: <chave-de-acesso>
```

### 6. Limpar Conversa
```
DELETE /api/assistant/conversation/:sessionId
Headers: x-kw-key: <chave-de-acesso>
```

## Estrutura do Projeto

```
src/
├── config/
│   ├── openai.js          # Configuração OpenAI
│   └── redis.js           # Configuração Redis
├── middleware/
│   ├── upload.js          # Middleware upload
│   └── validation.js      # Validações
├── routes/
│   └── assistant.js       # Rotas da API
├── services/
│   ├── conversation.js    # Gerenciamento conversas
│   ├── corpeApi.js       # Integração API Corpe
│   └── openai.js         # Processamento OpenAI
└── server.js             # Servidor principal
```

## Funcionamento

1. **Sessão**: Cada conversa é identificada por um UUID único
2. **Persistência**: Últimas 50 mensagens salvas no Redis por 24h
3. **Validação**: Chave KW obrigatória no header `x-kw-key`
4. **Funções**: Assistant usa function calling para consultar APIs
5. **Imagens**: GPT-4 Vision extrai CPF de documentos enviados

## Exemplos de Uso

### Chat Texto
```javascript
const response = await fetch('/api/assistant/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-kw-key': 'sua-chave-aqui'
  },
  body: JSON.stringify({
    message: 'Olá, quero consultar meus boletos',
    sessionId: 'uuid-opcional'
  })
});
```

### Upload de Imagem
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('sessionId', sessionId);

const response = await fetch('/api/assistant/image', {
  method: 'POST',
  headers: {
    'x-kw-key': 'sua-chave-aqui'
  },
  body: formData
});
```

## Desenvolvimento

### Scripts Disponíveis
```bash
npm start      # Inicia em produção
npm run dev    # Inicia em desenvolvimento (nodemon)
npm test       # Executa testes (Jest)
```

### Configuração do Redis
O Redis pode ser configurado via URL completa ou variáveis separadas:
```bash
REDIS_URL=redis://username:password@host:port/database
```

### Logs
O sistema gera logs detalhados para:
- Requisições HTTP (Morgan)
- Chamadas para APIs externas
- Operações Redis
- Processamento OpenAI

## Segurança

- ✅ Helmet para headers de segurança
- ✅ Validação de entrada com Joi
- ✅ Limite de tamanho para uploads (5MB)
- ✅ Timeout em requisições externas
- ✅ Sanitização de dados

## Limitações

- Máximo 50 mensagens por conversa
- Imagens limitadas a 5MB (JPEG/PNG)
- Conversas expiram em 24 horas
- Apenas consultas de boletos e carteirinhas

## Suporte

Para dúvidas sobre as APIs da Corpe, consulte a documentação oficial ou entre em contato com o suporte técnico.