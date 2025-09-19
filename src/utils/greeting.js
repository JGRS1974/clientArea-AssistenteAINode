function getSaoPauloDate(baseDate = new Date()) {
  const locale = baseDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(locale);
}

function getTimeOfDayGreeting(baseDate = new Date()) {
  const date = getSaoPauloDate(baseDate);
  const hour = date.getHours();

  if (hour < 12) {
    return 'bom dia';
  }

  if (hour < 19) {
    return 'boa tarde';
  }

  return 'boa noite';
}

module.exports = {
  getTimeOfDayGreeting
};
