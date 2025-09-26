const OpenAI = require('openai');
const templateService = require('../services/templates');
//const promptLoader = require('../services/promptLoader');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Usando Templates handlebars
const createSystemPrompt = async (kw, statusLogin, isFirstAssistantTurn, options = {}) => {
  return await templateService.renderSystemPrompt(kw, statusLogin, isFirstAssistantTurn, options);
};

// Usando PromptLoader
// const createSystemPrompt = async (kwKey, variables = {}) => {
//   return await promptLoader.getSystemPrompt(kwKey, variables);
// };

const getFunctions = ({ includeCardLookup = true } = {}) => {
  const functions = [
    {
      name: 'ticket_lookup',
      description: 'Consulta boletos em aberto do usuário',
      parameters: {
        type: 'object',
        properties: {
          cpf: {
            type: 'string',
            description: 'CPF do usuário (apenas números)'
          }
        },
        required: ['cpf']
      }
    }
  ];

  if (includeCardLookup) {
    functions.push({
      name: 'card_lookup',
      description: 'Consulta informações da carteirinha do usuário',
      parameters: {
        type: 'object',
        properties: {
          cpf: {
            type: 'string',
            description: 'CPF do usuário (apenas números)'
          },
          kw: {
            type: 'string',
            description: 'Chave de acesso KW'
          }
        },
        required: ['cpf', 'kw']
      }
    });
  }

  return functions;
};

module.exports = {
  openai,
  createSystemPrompt,
  getFunctions
};
