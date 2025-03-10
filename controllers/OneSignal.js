const OneSignal = require('onesignal-node');
const dotenv = require('dotenv');
dotenv.config();

const client = new OneSignal.Client(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_APP_KEY, { apiRoot: 'https://onesignal.com/api/v1' });

const sendNotification = async (title, message, userId) => {
  console.log(userId)
  const notification = {
    app_id: process.env.ONESIGNAL_APP_ID,
    big_picture: 'https://www.svgrepo.com/show/526901/chat-round-money.svg',
    ios_attachments: { id: 'https://www.svgrepo.com/show/526901/chat-round-money.svg' },
    data: {
      deep_link: 'https://www.google.com',
    },
    headings: {
      en: title,
    },
    contents: {
      en: message, // Conteúdo da notificação
    },
    filters: [
      { field: 'tag', key: 'token', relation: '=', value: userId }, // Filtro por tag
    ],
  };

  try {
    const response = await client.createNotification(notification);
    console.log('Notification sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

module.exports = { sendNotification };