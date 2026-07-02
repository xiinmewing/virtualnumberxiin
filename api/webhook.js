const bot = require('../bot');

module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body, res);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send('OK');
  }
};
