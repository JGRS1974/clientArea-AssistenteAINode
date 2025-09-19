const { getRedisClient } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

const CONVERSATION_PREFIX = 'assistente_Corpe_node_conversation:';
const CONVERSATION_LIMIT = parseInt(process.env.CONVERSATION_LIMIT) || 50;

const getConversationKey = (conversationId) => `${CONVERSATION_PREFIX}${conversationId}`;

const createConversationId = () => {
  return uuidv4();
};

const saveMessage = async (conversationId, role, content, metadata = {}) => {
  try {
    const redis = getRedisClient();
    const key = getConversationKey(conversationId);
    
    const message = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    
    // Adiciona mensagem à lista
    await redis.lPush(key, JSON.stringify(message));
    
    // Mantém apenas as últimas 50 mensagens
    await redis.lTrim(key, 0, CONVERSATION_LIMIT - 1);
    
    // Define expiração para 24 horas
    //await redis.expire(key, 86400);
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    return false;
  }
};

const getConversation = async (conversationId) => {
  try {
    const redis = getRedisClient();
    const key = getConversationKey(conversationId);
    
    const messages = await redis.lRange(key, 0, -1);
    
    // Retorna mensagens na ordem cronológica (mais antigas primeiro)
    return messages.reverse().map(msg => JSON.parse(msg));
  } catch (error) {
    console.error('Erro ao recuperar conversa:', error);
    return [];
  }
};

const clearConversation = async (conversationId) => {
  try {
    const redis = getRedisClient();
    const key = getConversationKey(conversationId);
    
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Erro ao limpar conversa:', error);
    return false;
  }
};

const formatMessagesForOpenAI = (messages) => {
  return messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));
};

module.exports = {
  createConversationId,
  saveMessage,
  getConversation,
  clearConversation,
  formatMessagesForOpenAI
};