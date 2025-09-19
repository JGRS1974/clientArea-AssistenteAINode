const axios = require('axios');

const apiConsumer = async (reqData, endpoint) => {

  const corpeApi = axios.create({
    baseURL: process.env.CORPE_API_BASE_URL,
    //timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Interceptor para log das requisições
  corpeApi.interceptors.request.use(
    (config) => {
      console.log(`[CORPE API] Requisição ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      console.error(`[CORPE API] Erro na requisição --> ${error}`);
      return Promise.reject(error);
    }
  );

  // Interceptor para log das respostas
  corpeApi.interceptors.response.use(
    (response) => {
      console.log(`[CORPE API] Resposta ${response.status} para Url ${response.config.method?.toUpperCase()} ${response.config.baseURL}${response.config.url}`);
      return response;
    },
    (error) => {
      console.error(`[CORPE API] Erro na resposta --> ${error.message}`);
      return Promise.reject(error);
    }
  );


  try {
   
    const response = await corpeApi.post(endpoint, reqData);
    return response.data;

  } catch (error) {

    const msg = error.response?.data?.message || error.message || "Erro desconhecido";
    console.error(`[CORPE API] Erro ao fazer a requisição na API Corpe. Erro: ${msg}`);
    error.message = msg;
    throw error;
  }
};

module.exports = {
  apiConsumer
};
