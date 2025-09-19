const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");

const FILE_PATH = path.join(__dirname, "pins.json");
const TTL = 24 * 60 * 60 * 1000; // 24 horas em ms

// cache em memória
let memoryPins = {};

// ------------------ UTILIDADES ------------------

// Carrega os PINs do arquivo para memória, limpando expirados
async function loadPins() {
  try {
    const data = await fs.readFile(FILE_PATH, "utf8");
    let pins = JSON.parse(data);
    const now = Date.now();
    let changed = false;

    // remove pins vencidos
    for (const [cpf, record] of Object.entries(pins)) {
      if (now - record.timestamp >= TTL) {
        delete pins[cpf];
        changed = true;
      }
    }

    if (changed) {
      await savePins(pins);
      if (process.env.NODE_ENV === "development") {
        console.log("loadPins: pins expirados removidos do arquivo");
      }
    }

    memoryPins = pins;
  } catch {
    memoryPins = {};
  }
}

// Salva no arquivo
async function savePins(pins = memoryPins) {
  await fs.writeFile(FILE_PATH, JSON.stringify(pins, null, 2), "utf8");
}

// Cleanup manual (pode ser chamado on access ou via cron interno)
async function cleanupPins() {
  const now = Date.now();
  let changed = false;

  for (const [cpf, data] of Object.entries(memoryPins)) {
    if (now - data.timestamp >= TTL) {
      delete memoryPins[cpf];
      changed = true;
    }
  }

  if (changed) {
    await savePins();
    if (process.env.NODE_ENV === "development") {
      console.log("cleanupPins: pins expirados removidos");
    }
  }
}

// ------------------ GERAÇÃO DE PIN ------------------

async function generatePin(cpf) {
  if (!cpf || typeof cpf !== "string") {
    throw new Error("CPF é obrigatório.");
  }

  const cpfNumerico = cpf.replace(/\D/g, "");
  if (cpfNumerico.length !== 11) {
    throw new Error("CPF deve conter 11 dígitos");
  }
 
  // sempre faz cleanup antes de continuar
  await cleanupPins();

  const now = Date.now();
  const stored = memoryPins[cpfNumerico];

  if (stored && now - stored.timestamp < TTL) {
    return stored.pin;
  }

  // Gera novo PIN
  const today = new Date();
  const formattedDate = today.toISOString().slice(0, 10).replace(/-/g, ""); // yyyyMMdd
  const PIN = "PN" + cpfNumerico + "@" + formattedDate;
  const pinOk = crypto.createHash("md5").update(PIN).digest("hex");

  // Atualiza cache + arquivo
  memoryPins[cpfNumerico] = { pin: pinOk, timestamp: now };
  await savePins();
  console.log(`pinOk: ${pinOk}`);
  return pinOk;
}

// ------------------ VALIDAÇÃO ------------------

function validateFormatCpf(cpf) {
  if (!cpf || typeof cpf !== "string") return false;
  return cpf.replace(/\D/g, "").length === 11;
}

// ------------------ EXPORTS ------------------

module.exports = {
  loadPins,
  generatePin,
  validateFormatCpf,
  cleanupPins,
};

// ------------------ AUTO-CLEANUP INTERNO ------------------

// roda a cada 1h para manter limpo
setInterval(cleanupPins, 60 * 60 * 1000);
