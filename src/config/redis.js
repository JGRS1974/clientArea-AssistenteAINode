const redis = require('redis');

let client;

const connectRedis = async () => {
  try {
    const redisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    };
    
    //if (process.env.REDIS_PASSWORD) {
      //redisConfig.password = process.env.REDIS_PASSWORD;
    //}

    client = redis.createClient(redisConfig);

    client.on('error', (err) => {
      console.error('Erro no Redis:', err);
    });

    client.on('connect', () => {
      console.log('Conectado ao Redis');
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('Erro ao conectar no Redis:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!client) {
    throw new Error('Redis não está conectado');
  }
  return client;
};

const closeRedis = async () => {
  if (client) {
    await client.quit();
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis
};