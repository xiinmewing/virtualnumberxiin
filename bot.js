const { Telegraf } = require('telegraf');
const axios = require('axios');

// ============ KONFIGURASI ============
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8741266761:AAHPLsEhJJ_kokafEBAOh2cD2zt97ncuV10';
const API_KEY = process.env.API_KEY || 'ISI_API_KEY'; // opsional
const API_BASE = 'https://opxotp.vercel.app/api/otp';

// ============ FUNGSI API ============
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
    return { error: error.message };
  }
}

async function getNumber() {
  const result = await callApi('getnum');
  if (result && result.data) return result.data;
  return null;
}

async function getOtp(phone) {
  const result = await callApi('success-otp', 'POST', { phone });
  if (result && result.data) return result.data;
  return null;
}

async function getConsole() {
  const result = await callApi('console');
  if (result && result.data) return result.data;
  return null;
}

// ============ BOT ============
const bot = new Telegraf(TELEGRAM_TOKEN);

// Command /start
bot.start((ctx) => {
  const welcome = `
🚀 *Selamat datang di OPx OTP Bot!*

📌 *Perintah:*
/getnum   - Ambil nomor virtual
/otp <no> - Cek OTP (contoh: /otp 6281234567890)
/console  - Lihat log aktivitas
/help     - Bantuan

Gunakan tombol di bawah:
  `;
  return ctx.reply(welcome, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 Ambil Nomor', callback_data: 'getnum' }],
        [{ text: '🔑 Cek OTP', callback_data: 'otp' }],
        [{ text: '📋 Console', callback_data: 'console' }]
      ]
    }
  });
});

bot.help((ctx) => ctx.reply(`
📖 *Panduan*
1. /getnum – dapatkan nomor virtual
2. /otp 628xxx – cek kode OTP
3. /console – lihat log
` , { parse_mode: 'Markdown' }));

// /getnum
bot.command('getnum', async (ctx) => {
  await ctx.reply('⏳ Mengambil nomor...');
  const data = await getNumber();
  if (data && data.phone) {
    const msg = `
✅ *Nomor:*
📞 \`${data.phone}\`
🌍 ${data.country || 'Unknown'}
⏳ Kadaluarsa: ${data.expires_in || '15 menit'}
➡️ Ketik /otp ${data.phone} untuk cek OTP
    `;
    return ctx.reply(msg, { parse_mode: 'Markdown' });
  } else {
    return ctx.reply('❌ Gagal ambil nomor. Coba lagi nanti.');
  }
});

// /otp <nomor>
bot.command('otp', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('⚠️ Kirim nomor: /otp 6281234567890');
  }
  const phone = args[1].trim();
  await ctx.reply(`⏳ Mengecek OTP untuk \`${phone}\`...`, { parse_mode: 'Markdown' });
  const data = await getOtp(phone);
  if (data && data.otp) {
    const msg = `
🔑 *Kode OTP:* \`${data.otp}\`
📞 ${phone}
📊 Status: ${data.status || 'OK'}
⏳ Sisa: ${data.expires_in || '-'}
    `;
    return ctx.reply(msg, { parse_mode: 'Markdown' });
  } else {
    return ctx.reply(`❌ Tidak ada OTP untuk \`${phone}\`. Pastikan nomor aktif.`, { parse_mode: 'Markdown' });
  }
});

// /console
bot.command('console', async (ctx) => {
  await ctx.reply('⏳ Mengambil log...');
  const logs = await getConsole();
  if (logs && logs.length > 0) {
    const last = logs.slice(-10).map(l => `${l.time} - ${l.message}`).join('\n');
    return ctx.reply(`📋 *Console (10 terakhir):*\n\`\`\`\n${last}\n\`\`\``, { parse_mode: 'Markdown' });
  } else {
    return ctx.reply('📭 Belum ada aktivitas.');
  }
});

// Callback tombol
bot.action('getnum', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('➡️ Ketik /getnum');
});
bot.action('otp', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('➡️ Kirim /otp diikuti nomor, misal: /otp 6281234567890');
});
bot.action('console', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply('➡️ Ketik /console');
});

// Default untuk pesan teks (bisa dikirim nomor langsung)
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  // Jika hanya angka (kemungkinan nomor) dan panjang > 8
  if (/^[\+\d\-]+$/.test(text) && text.replace(/[\+\-]/g, '').length >= 8) {
    // panggil /otp dengan nomor itu
    ctx.message.text = `/otp ${text}`;
    return bot.handleUpdate(ctx.update);
  }
  // selain itu ignore
});

// Ekspor bot untuk Vercel (handler webhook)
module.exports = bot;

// Jika dijalankan langsung (development polling)
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('Bot running in polling mode...');
}
