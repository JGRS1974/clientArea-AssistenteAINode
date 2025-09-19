const { generatePin } = require('../utils/pinGenerator')
const { apiConsumer } = require('../services/corpeAPI');
const crypto = require("crypto");
const NodeCache = require("node-cache");

// cache em memória com TTL (em segundos)
const boletoCache = new NodeCache();
const BOLETO_CACHE_PREFIX = "boleto_pdf_";

function cacheBoletoPdf(token, pdfBase64, ttlSeconds = 3600) {
  if (!token || !pdfBase64) {
    return false;
  }

  return boletoCache.set(`${BOLETO_CACHE_PREFIX}${token}`, pdfBase64, ttlSeconds);
}

function getCachedBoletoPdf(token) {
  if (!token) {
    return null;
  }

  return boletoCache.get(`${BOLETO_CACHE_PREFIX}${token}`) || null;
}

function invalidateCachedBoletoPdf(token) {
  if (!token) {
    return false;
  }

  return boletoCache.del(`${BOLETO_CACHE_PREFIX}${token}`) > 0;
}

async function ticket_lookup(cpf) {
  try {

    let pin = '';
    let tickets = '';
  
    pin = await generatePin(cpf);
   
    const data = {cpf, pin};
    const response = await apiConsumer(data, process.env.CORPE_COBRANCAS_ENDPOINT)
    const { quantidade, cobrancas } = response;

    if (!quantidade || quantidade === 0) {
      return tickets = `Nenhum boleto encontrado para o CPF ${cpf}`;
    }
    
    const arrayTemp = [];

    // percorre cada cobrança e pega o código
    for (const cobranca of cobrancas) {

      try {
        const dataTicket = {cpf, codigocobranca: cobranca.codigo, pin};
        const responseTicket = await apiConsumer(dataTicket, process.env.CORPE_BOLETOS_ENDPOINT)

        arrayTemp.push(responseTicket);
        //console.log("Detalhe do boleto:", responseTicket.data);
      } catch (err) {
        console.error(`[TICKET TOOL] Erro ao recuperar o boleto do usuário. Data --> {cpf: ${cpf}, codigocobranca: ${cobranca.codigo}, pin: ${pin}} / Erro --> ${err}`);
      }
    }

    if (!arrayTemp.length){
      tickets = `Nenhum boleto encontrado para o CPF ${cpf}.`;
    }else{
      tickets = formatTicketResponse(arrayTemp)
    }

    return tickets;

  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Erro desconhecido";
    console.error(`[TICKET TOOL] Erro ao buscar boletos para o cpf ${cpf}. Erro: ${msg}`);
    
    if (error.response?.status === 404) {
      return `Nenhum boleto encontrado para o CPF ${cpf}`;
    }

    return `Erro ao consultar o boleto do CPF ${cpf}.`;
  }
};

function formatLinhaDigitavel(linha) {
  if (!linha) {
    return linha;
  }

  const digits = String(linha).replace(/\D/g, "");

  if (digits.length !== 47) {
    return linha;
  }

  const campo1 = `${digits.slice(0, 5)}.${digits.slice(5, 10)}`;
  const campo2 = `${digits.slice(10, 15)}.${digits.slice(15, 21)}`;
  const campo3 = `${digits.slice(21, 26)}.${digits.slice(26, 32)}`;
  const campo4 = digits.slice(32, 33);
  const campo5 = digits.slice(33);

  return `${campo1} ${campo2} ${campo3} ${campo4} ${campo5}`;
}

function formatTicketResponse(ticketsData) {
  let response = "";
  let validTickets = 0;
  const ticketResponses = [];

  ticketsData.forEach((ticket, index) => {
    let ticketResponse = "";

    // se veio mensagem de erro
    if (ticket.message) {
      ticketResponse = `❌ Boleto ${index + 1}: ${ticket.message}\n\n`;
      ticketResponses.push(ticketResponse);
      return;
    }

    // se veio boleto válido
    if (ticket.linhaDigitavel && ticket.boleto) {
      validTickets++;

      // gera token único de 32 caracteres
      const token = crypto.randomBytes(16).toString("hex");

      // guarda PDF em base64 no cache por 1h
      cacheBoletoPdf(token, ticket.boleto, 3600);

      // gera link de download (ajusta conforme tua rota)
      const baseUrl = process.env.APP_URL || "http://localhost:3000";
      const downloadLink = `${baseUrl}/api/boleto/download/${token}`;

      // formata linha digitável
      const linhaDigitavel = formatLinhaDigitavel(ticket.linhaDigitavel);

      if (ticketsData.length > 1) {
        ticketResponse = `✅ **Boleto ${index + 1} encontrado!**\n\n`;
      } else {
        ticketResponse = `✅ **Boleto encontrado!**\n\n`;
      }

      ticketResponse += `📋 **Linha Digitável:**\n`;
      ticketResponse += `\`${linhaDigitavel}\`\n\n`;
      ticketResponse += `📄 **Download do PDF:**\n`;
      ticketResponse += `Clique no seguinte link para baixar o boleto: ${downloadLink}\n\n`;
      ticketResponse +=
        "💡 **Dica:** Você pode copiar a linha digitável acima para pagar o boleto no internet banking ou app do seu banco.\n";
      ticketResponse +=
        "⏰ **Atenção:** O link para download expira em 1 hora.\n\n";

      ticketResponses.push(ticketResponse);
    }
  });

  // resumo final
  if (validTickets > 1) {
    response = `✅ **${validTickets} Boletos encontrados!**\n\n`;
  } else if (validTickets === 1) {
    response = ""; // será preenchido individualmente
  }

  response += ticketResponses.join("---\n\n");

  return response.trim() || "Erro ao processar informações dos boletos.";
}

module.exports = {
  ticket_lookup,
  cacheBoletoPdf,
  getCachedBoletoPdf,
  invalidateCachedBoletoPdf,
  formatLinhaDigitavel
};
