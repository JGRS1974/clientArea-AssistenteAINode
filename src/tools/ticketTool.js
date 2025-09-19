const { generatePin } = require('../utils/pinGenerator')
const { apiConsumer } = require('../services/corpeAPI');
const crypto = require("crypto");
const NodeCache = require("node-cache");

// cache em memória com TTL (em segundos)
const boletoCache = new NodeCache();

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
  // remove pontos e espaços
  const clean = linha.replace(/[.\s]/g, "");
  // formata igual ao preg_replace do PHP
  return clean.replace(
    /(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d)(\d{14})/,
    "$1.$2 $3.$4 $5.$6 $7 $8"
  );
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
      boletoCache.set(`boleto_pdf_${token}`, ticket.boleto, 3600);

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
  ticket_lookup
};