const { openai, createSystemPrompt, getFunctions } = require('../config/openai');
const { ticket_lookup, formatLinhaDigitavel } = require('../tools/ticketTool');
const { card_lookup } = require('../tools/cardTool');

const LINEA_DIGITAVEL_REGEX = /\b\d{47}\b/g;

const formatLinhaDigitavelInText = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text.replace(LINEA_DIGITAVEL_REGEX, (match) => formatLinhaDigitavel(match));
};

const processUserMessage = async (messages, kw, isFirstAssistantTurn) => {
  try {

    const statusLogin = kw ? 'usuário logado' : 'usuário não logado';
    
    const systemPrompt = await createSystemPrompt(kw, statusLogin, isFirstAssistantTurn);
    const functions = getFunctions();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      functions,
      function_call: 'auto',
      temperature: 0.5,
      max_tokens: 1000
    });
    
    const message = completion.choices[0].message;

    // Se a IA quer chamar uma função
    if (message.function_call) {
      const functionName = message.function_call.name;
      const functionArgs = JSON.parse(message.function_call.arguments);

      let functionResult;

      switch (functionName) {
        case 'ticket_lookup':
          functionResult = await ticket_lookup(functionArgs.cpf);
          break;
        case 'card_lookup': {
          const kwArgument = functionArgs.kw ?? kw;

          if (!kwArgument) {
            functionResult = {
              success: false,
              error: 'Para consultar sua carteirinha, você precisa estar logado no sistema. Posso ajudar em mais alguma coisa?'
            };
          } else {
            functionResult = await card_lookup(functionArgs.cpf, kwArgument);
          }
          break;
        }
        default:
          functionResult = { success: false, error: 'Função não encontrada' };
      }

      // Fazer uma segunda chamada com o resultado da função
      const secondCompletion = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
          message,
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult)
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      const assistantReply = secondCompletion.choices[0].message.content;

      return {
        success: true,
        response: formatLinhaDigitavelInText(assistantReply),
        functionCalled: functionName,
        functionArgs,
        functionResult
      };
    }

    return {
      success: true,
      response: formatLinhaDigitavelInText(message.content)
    };

  } catch (error) {
    console.error('Erro no OpenAI:', error);
    
    if (error.status === 401) {
      return {
        success: false,
        error: 'Erro de autenticação com OpenAI. Verifique a API key.'
      };
    }
    
    if (error.status === 429) {
      return {
        success: false,
        error: 'Limite de requisições excedido. Tente novamente em alguns instantes.'
      };
    }
    
    return {
      success: false,
      error: 'Erro interno. Tente novamente.'
    };
  }
};

const processImageMessage = async (imageBuffer, mimeType, kw) => {
  try {
    const systemPrompt = createSystemPrompt(kw);
    
    // Converte a imagem para base64
    const base64Image = imageBuffer.toString('base64');
    
    const completion = await openai.chat.completions.create({
      model: 'whisper-1',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Por favor, extraia o CPF deste documento e me ajude com as consultas de boletos ou carteirinha.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    });

    return {
      success: true,
      response: completion.choices[0].message.content
    };

  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    return {
      success: false,
      error: 'Erro ao processar imagem. Tente novamente ou digite seu CPF.'
    };
  }
};

module.exports = {
  processUserMessage,
  processImageMessage
};
