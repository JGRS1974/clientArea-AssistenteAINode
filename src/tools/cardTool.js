const { apiConsumer } = require('../services/corpeAPI');

const card_lookup = async (cpf, kw) => {
  try {

    const data = {cpf, kw};
    
    const response = await apiConsumer(data, process.env.CORPE_CARTEIRINHA_ENDPOINT)
   
    const { quantidade, planos } = response;
    
    if (!quantidade || quantidade === 0) {
      console.log('ENTROU AQUI');
      return `Nenhuma informação da carteirinha foi encontrada para o CPF ${cpf}.`;
    }
    
    const beneficiariesInformation = [];
  
    // percorre os planos e depois os beneficiários
    for (const plano of planos) {
      if (Array.isArray(plano.beneficiarios)) {
        for (const beneficiario of plano.beneficiarios) {
          if (beneficiario.numerocarteira && beneficiario.numerocarteira.trim() !== "") {
            beneficiariesInformation.push(beneficiario);
          }
        }
      }
    }
    
    if (!beneficiariesInformation || beneficiariesInformation.length === 0){
      return `Nenhuma informação da carteirinha foi encontrada para o CPF ${cpf}.`;
    }else{

      let response = "Informações da carteirinha encontradas:\n\n";

      beneficiariesInformation.forEach((beneficiario, index) => {
        response += `📋 Beneficiário ${index + 1}:\n`;
        response += `• Nome: ${beneficiario.nome}\n`;
        response += `• Tipo: ${beneficiario.tipo}\n`;
        response += `• CPF: ${beneficiario.cpf}\n`;

        // se houver várias carteirinhas, iteramos
        if (Array.isArray(beneficiario.carteirinhas)) {
          beneficiario.carteirinhas.forEach((carteira, idx) => {
            response += `🔑 Carteirinha ${idx + 1}:\n`;
            response += `• Número da Carteira: ${carteira.numerocarteira}\n`;

            if (carteira.numerocarteiraodonto) {
              response += `   • Carteira Odonto: ${carteira.numerocarteiraodonto}\n`;
            }

            if (carteira.datanascimento) {
              const nascimento = new Date(carteira.datanascimento);
              const dataNascimento = nascimento.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
              response += `• Data de Nascimento: ${dataNascimento}\n`;
            }

            response += "\n";
          });
        } else {
        // fallback se vier só uma carteirinha no objeto raiz
          response += `• Número da Carteira: ${beneficiario.numerocarteira}\n`;
          if (beneficiario.numerocarteiraodonto) {
            response += `• Carteira Odonto: ${beneficiario.numerocarteiraodonto}\n`;
          }
          if (beneficiario.datanascimento) {
            const nascimento = new Date(beneficiario.datanascimento);
            const dataNascimento = nascimento.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
            response += `• Data de Nascimento: ${dataNascimento}\n`;
          }
          response += "\n";
        }
      });

      return response;
    }

  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Erro desconhecido";
    console.error(`[CARD TOOL] Erro ao buscar informação da carteirinha para o Cpf ${cpf}. Erro: ${msg}`);
    
    // Propaga erro específico de KW inválida / acesso expirado para o prompt tratar corretamente
    try {
      if (
        /kw\s*inv(?:á|a)lid[ao]/i.test(msg) ||
        /acesso\s*expirad/i.test(msg) ||
        /token\s*(?:inv(?:á|a)lid[ao]|expirad)/i.test(msg)
      ) {
        return 'KW inválida';
      }
    } catch (_) { /* noop */ }
    
    if (error.response?.status === 404) {
      return `Nenhuma informação da carteirinha foi encontrada para o CPF ${cpf}.`;
    }

    return `Não foi possível consultar a informação da carteirinha para o CPF do cliente ${cpf}, ocorreu um erro técnico.`;
  }
};

module.exports = {
  card_lookup
};
