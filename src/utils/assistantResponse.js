function sendAssistantResponse(res, text, conversationId = null, extra = {}) {
  const payload = {
    text,
    conversation_id: conversationId,
    ...extra
  };

  return res.status(200).json(payload);
}

module.exports = {
  sendAssistantResponse
};
