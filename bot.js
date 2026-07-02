const { Telegraf } = require('telegraf');
const axios = require('axios');

// Konfigurasi dari Environment Variables
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_BASE = 'https://opxotp.vercel.app/api/otp';

// Fungsi API
async function callApi(endpoint, method = 'GET', payload = null) {
  const url = `${API_BASE}?endpoint=${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    const response = await axios({
      method,
      url,
      headers,
      data: payload,
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.message);
    return { error: true, message: error.message };
  }
}

async function getNumber() {
  const result = await callApi('getnum');
  if (result && result.data && result.data.phone) {
    return result.data;
  }
  return null;
}

async function getOtp(phone) {
  const result = await callApi('success-otp', 'POST', { phone });
  if (result && result.data && result.data.otp) {
    return result.data;
  }
  return null;
}

// BOT
const bot = new Telegraf(TELEGRAM_TOKEN);

// START
bot.start((ctx) => {
  ctx.reply(
    `🚀 *Selamat datang!*\n\n` +
    `/getnum - Ambil nomor\n` +
    `/otp <no> - Cek OTP\n` +
    `/help - Bantuan`,
    { parse_mode: 'Markdown' }
  );
});

// GETNUM
bot.command('getnum', async (ctx) => {
  const msg = await ctx.reply('⏳ Mengambil nomor...');
  const data = await getNumber();
  
  if (data && data.phone) {
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      null,
      `✅ *Nomor:* \`${data.phone}\`\n🌍 ${data.country || 'Unknown'}\n⏳ ${data.expires_in || '15 menit'}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      null,
      '❌ Gagal ambil nomor. API mungkin offline atau butuh API_KEY.'
    );
  }
});

// OTP
bot.command('otp', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('⚠️ Kirim: /otp 6281234567890');
  }
  const phone = args[1].trim();
  const msg = await ctx.reply(`⏳ Cek OTP untuk \`${phone}\`...`, { parse_mode: 'Markdown' });
  
  const data = await getOtp(phone);
  if (data && data.otp) {
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      null,
      `🔑 *OTP:* \`${data.otp}\`\n📞 ${phone}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      null,
      `❌ Tidak ada OTP untuk \`${phone}\``,
      { parse_mode: 'Markdown' }
    );
  }
});

// HELP
bot.help((ctx) => ctx.reply('📖 /getnum - ambil nomor\n/otp <no> - cek OTP'));

// Export untuk Vercel
module.exports = bot;

// Local testing
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('Bot running locally...');
}
