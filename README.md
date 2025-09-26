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
CORPE_API_BASE_URL=
CORPE_COBRANCAS_ENDPOINT=/tsmadesao/cobrancas
CORPE_BOLETOS_ENDPOINT=/tsmboletos/boleto
CORPE_CARTEIRINHA_ENDPOINT=/tsmadesao/beneficiario

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

### 2. Chat por Texto
```
POST /assistant/chat
Headers: kw: <chave-de-acesso> (após usuário fazer login no sistema)
Body: {
  "text": "Quero consultar meus boletos",
  "conversation_id": "uuid-da-conversa" // opcional
}
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
├── templates/
│   └── system-prompt.hbs # System prompt utilizado no modelo OpenAI
├── tools/
│   ├── cardTool.js        # Tool para fazer requisição na API Corpe - recuperar carteirinha
│   └── ticketTool.js      # Tool para fazer requisição na API Corpe - recuperar boleto/s
├── utils/
│   ├── pinGenerator.js    # Gera o pin para ser enviado nas requisições de consulta na API Corpe
│   └── pins.json          # Arquivo json com os pins de acesso para cada cpf informado - os pins expiram a cada 24hs
└── server.js             # Servidor principal
```

## Funcionamento

1. **Conversação**: Cada conversa é identificada por um UUID único
2. **Persistência**: Últimas 50 mensagens salvas no Redis
3. **Validação**: Chave KW no header `kw` - obrigatória para consulta da carteirinha
4. **Funções**: Assistant usa function calling para consultar API Corpe

## Exemplos de Uso

### Chat Texto
```javascript
const response = await fetch('/assistant/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'kw': 'sua-chave-aqui/null ou não enviar'
  },
  body: JSON.stringify({
    message: 'Olá, quero consultar meus boletos',
    conversation_id: 'uuid-opcional'
  })
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
- Apenas consultas de boletos e carteirinhas
