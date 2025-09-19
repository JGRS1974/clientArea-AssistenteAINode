const CPF_REGEX = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

function sanitizeCpf(cpf) {
  if (!cpf) {
    return '';
  }

  return cpf.replace(/\D/g, '').slice(0, 11);
}

function formatCpf(cpfDigits) {
  const digits = sanitizeCpf(cpfDigits);

  if (digits.length !== 11) {
    return cpfDigits;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function extractCpfsFromText(text) {
  if (!text) {
    return [];
  }

  const matches = text.match(CPF_REGEX) || [];
  const unique = new Set();

  matches.forEach((match) => {
    const digits = sanitizeCpf(match);
    if (digits.length === 11) {
      unique.add(digits);
    }
  });

  return Array.from(unique);
}

module.exports = {
  extractCpfsFromText,
  sanitizeCpf,
  formatCpf
};
