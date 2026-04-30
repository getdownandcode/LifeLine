async function sendNotification({ channel, to, subject, message }) {
  return {
    provider: process.env.NOTIFICATION_PROVIDER || 'console',
    channel,
    to,
    subject,
    message,
    status: 'sent',
    sentAt: new Date().toISOString()
  };
}

module.exports = { sendNotification };
