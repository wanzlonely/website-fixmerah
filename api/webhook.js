import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.join('/tmp', 'fw_tokens.json');
const BOT_TOKEN  = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const WEBSITE_URL = process.env.WEBSITE_URL;
const OWNER_ID   = Number(process.env.OWNER_ID);
const LINE = '─'.repeat(28);

/* ── PENTING: Ini memberitahu Vercel untuk parse body JSON ── */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

/* ── Storage ── */
function loadTokens() {
  try { if (fs.existsSync(TOKEN_FILE)) return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); } catch {}
  return {};
}
function saveTokens(t) {
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2)); } catch {}
}
function cleanExpired(t) {
  const now = Date.now();
  for (const k in t) { if (t[k].expires_at < now) delete t[k]; }
  return t;
}

/* ── Helpers ── */
function generateToken() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}
function formatDate(ts) {
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) + ' WIB';
}
function esc(t) { return String(t ?? '').replace(/[_*[\]()~`>#+\-=|{}.!]/g, c => `\\${c}`); }
function isOwner(id) { return OWNER_ID && id === OWNER_ID; }

/* ── Telegram API ── */
async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await r.json();
  // Log jika Telegram menolak pesan (untuk debug)
  if (!json.ok) console.error(`Telegram error on ${method}:`, JSON.stringify(json));
  return json;
}
function send(chat_id, text, opts = {}) {
  return tg('sendMessage', { chat_id, text, parse_mode: 'MarkdownV2', ...opts });
}
function answerCB(callback_query_id) {
  return tg('answerCallbackQuery', { callback_query_id });
}

/* ── Command Handlers ── */
async function handleStart(msg) {
  const u = msg.from;
  return send(msg.chat.id,
    `✦ *FIXMERAH WALZ*\n${LINE}\n\nHalo *${esc(u.first_name)}*\\! 👋\n\nBot ini untuk mengakses website *FIXMERAH WALZ* menggunakan *Token Akses*\\.\n\n*Cara masuk:*\n① Dapatkan token dari owner\n② Buka website di bawah\n③ Masukkan token → klik *Masuk*\n④ Website terbuka ✅\n\nPunya token? Ketik \\`/cek TOKEN\\` untuk cek sisa masa aktif\\.\n\n${LINE}`,
    { reply_markup: { inline_keyboard: [[{ text: '🌐  Buka Website', url: WEBSITE_URL }]] } }
  );
}

async function handleInfo(msg) {
  return send(msg.chat.id,
    `ℹ️ *Info Bot*\n${LINE}\n\n*Nama:* FIXMERAH WALZ\n*Status:* 🟢 Online\n*Website:* [Klik di sini](${WEBSITE_URL})\n\n*Perintah tersedia:*\n/start › Halaman utama\n/cek \\[token\\] › Cek info token\n/help › Daftar perintah\n\n${LINE}`
  );
}

async function handleGentoken(msg, match) {
  if (!isOwner(msg.from.id)) return send(msg.chat.id, `🚫 *Akses Ditolak*\n\n_Hanya untuk owner\\._`);

  const days = Math.min(30, Math.max(1, parseInt(match?.[1] || '7')));
  const token = generateToken();
  const now = Date.now();
  const expires_at = now + days * 86_400_000;

  let tokens = cleanExpired(loadTokens());
  tokens[token] = { created_at: now, expires_at, days, created_by: msg.from.id, used_by: null, used_at: null };
  saveTokens(tokens);

  return send(msg.chat.id,
    `🎟️ *Token Berhasil Dibuat\\!*\n${LINE}\n\nToken    › \\`${esc(token)}\\`\nDurasi   › *${days} hari*\nBerakhir › *${esc(formatDate(expires_at))}*\n\n_Kirim token ini ke user\\._\n\n${LINE}`,
    { reply_markup: { inline_keyboard: [[{ text: '🌐  Buka Website', url: WEBSITE_URL }]] } }
  );
}

async function handleListtokens(msg) {
  if (!isOwner(msg.from.id)) return send(msg.chat.id, `🚫 *Akses Ditolak*`);

  let tokens = cleanExpired(loadTokens());
  saveTokens(tokens);
  const list = Object.entries(tokens);
  if (!list.length) return send(msg.chat.id, `📋 *Token Aktif*\n${LINE}\n\n_Tidak ada token aktif\\._`);

  const rows = list.slice(0, 20).map(([tok, d]) => {
    const sisa = Math.ceil((d.expires_at - Date.now()) / 86_400_000);
    return `• \\`${esc(tok)}\\` › ${sisa}h ${d.used_by ? '✅' : '⏳'}`;
  }).join('\n');
  const extra = list.length > 20 ? `\n_\\.\\.\\. ${list.length - 20} lainnya_` : '';

  return send(msg.chat.id, `📋 *Token Aktif \\(${list.length}\\)*\n${LINE}\n\n${rows}${extra}\n\n${LINE}`);
}

async function handleDeltoken(msg, match) {
  if (!isOwner(msg.from.id)) return send(msg.chat.id, `🚫 *Akses Ditolak*`);
  const key = (match?.[1] || '').trim().toUpperCase();
  if (!key) return send(msg.chat.id, `⚠️ Gunakan: \\`/del TOKEN\\``);

  let tokens = loadTokens();
  if (!tokens[key]) return send(msg.chat.id, `❌ Token tidak ditemukan`);
  delete tokens[key];
  saveTokens(tokens);
  return send(msg.chat.id, `✅ *Token Dihapus*\n\n\\`${esc(key)}\\``);
}

async function handleCektoken(msg, match) {
  const key = (match?.[1] || '').trim().toUpperCase();
  if (!key) return send(msg.chat.id,
    `🔍 *Cek Token*\n${LINE}\n\nKetik: \\`/cek TOKEN\\`\n\nContoh: \\`/cek A1B2C3\\``
  );

  let tokens = cleanExpired(loadTokens());
  const data = tokens[key];
  if (!data) return send(msg.chat.id,
    `❌ *Token Tidak Valid*\n${LINE}\n\n\\`${esc(key)}\\` tidak ditemukan atau sudah kedaluwarsa\\.`
  );

  const sisa = Math.ceil((data.expires_at - Date.now()) / 86_400_000);
  const status = data.used_by ? `✅ Sudah digunakan` : `⏳ Belum digunakan`;
  const usedTxt = data.used_at ? `\nDipakai  › ${esc(formatDate(data.used_at))}` : '';

  return send(msg.chat.id,
    `🎟️ *Info Token*\n${LINE}\n\nToken    › \\`${esc(key)}\\`\nStatus   › ${status}\nDurasi   › *${data.days} hari*\nBerakhir › *${esc(formatDate(data.expires_at))}*\nSisa     › *${sisa} hari lagi*${usedTxt}\n\n${LINE}`,
    { reply_markup: { inline_keyboard: [[{ text: '🚀  Buka Website', url: WEBSITE_URL }]] } }
  );
}

async function handleAdmin(msg) {
  if (!isOwner(msg.from.id)) return send(msg.chat.id, `🚫 *Akses Ditolak*\n\n_Hanya untuk owner\\._`);

  let tokens = cleanExpired(loadTokens());
  saveTokens(tokens);
  const total = Object.keys(tokens).length;
  const used  = Object.values(tokens).filter(t => t.used_by).length;

  return send(msg.chat.id,
    `⚙️ *Panel Owner*\n${LINE}\n\nWebsite   › ${esc(WEBSITE_URL)}\nStatus    › 🟢 Online\n\n*📊 Statistik Token:*\nTotal     › ${total} token aktif\nDipakai   › ${used} token\nTersedia  › ${total - used} token\n\n*Buat token cepat:*\n\\`/gen 7\\` → token 7 hari\n\\`/gen 30\\` → token 30 hari\n\n${LINE}`,
    { reply_markup: { inline_keyboard: [
      [{ text: '🌐  Website', url: WEBSITE_URL }, { text: '📊  Admin Panel', url: `${WEBSITE_URL}/admin.html` }],
      [{ text: '🎟️  Token 7 Hari', callback_data: 'gen_7' }, { text: '🎟️  Token 30 Hari', callback_data: 'gen_30' }]
    ]}}
  );
}

async function handleHelp(msg) {
  const ownerCmds = isOwner(msg.from.id)
    ? `\n\n*🔧 Perintah Owner:*\n/gen \\[hari\\] › Buat token baru\n/list › Semua token aktif\n/del \\[token\\] › Hapus token\n/admin › Panel admin` : '';

  return send(msg.chat.id,
    `📖 *Bantuan*\n${LINE}\n\n*📋 Perintah Umum:*\n/start › Halaman utama\n/info › Info bot\n/cek \\[token\\] › Cek info token\n/help › Daftar perintah${ownerCmds}\n\n${LINE}`
  );
}

/* ── Callback Query ── */
async function handleCallback(query) {
  await answerCB(query.id);
  if (!isOwner(query.from.id)) return;

  if (query.data?.startsWith('gen_')) {
    const days = parseInt(query.data.split('_')[1]);
    if (isNaN(days)) return;

    const token = generateToken();
    const now = Date.now();
    const expires_at = now + days * 86_400_000;
    let tokens = cleanExpired(loadTokens());
    tokens[token] = { created_at: now, expires_at, days, created_by: query.from.id, used_by: null, used_at: null };
    saveTokens(tokens);

    return send(query.message.chat.id,
      `🎟️ *Token Baru \\(${days} Hari\\)*\n${LINE}\n\n\\`${esc(token)}\\`\nBerakhir › *${esc(formatDate(expires_at))}*\n\n${LINE}`
    );
  }
}

/* ── Main update dispatcher ── */
async function handleUpdate(update) {
  if (update.callback_query) {
    return handleCallback(update.callback_query);
  }

  const msg = update.message;
  if (!msg || !msg.text) return;

  const text = msg.text.trim();

  if (/^\/start(@\w+)?$/.test(text))              return handleStart(msg);
  if (/^\/help(@\w+)?$/.test(text))               return handleHelp(msg);
  if (/^\/info(@\w+)?$/.test(text))               return handleInfo(msg);   // ← TAMBAH INI
  if (/^\/admin(@\w+)?$/.test(text))              return handleAdmin(msg);
  if (/^\/list(@\w+)?$/.test(text))               return handleListtokens(msg);

  let m;
  if ((m = text.match(/^\/gen(?:token)?(?:@\w+)?(?:\s+(\d+))?/))) return handleGentoken(msg, m);
  if ((m = text.match(/^\/del(?:token)?(?:@\w+)?(?:\s+(.+))?/)))  return handleDeltoken(msg, m);
  if ((m = text.match(/^\/cek(?:token)?(?:@\w+)?(?:\s+(.+))?/)))  return handleCektoken(msg, m);
}

/* ── Vercel handler ── */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, info: 'Webhook aktif' });

  // Pastikan body sudah ter-parse (fallback jika belum)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(200).json({ ok: true }); }
  }

  try {
    await handleUpdate(body);
  } catch (err) {
    // Log error detail ke Vercel logs agar bisa di-debug
    console.error('Webhook error:', err.message, err.stack);
  }

  return res.status(200).json({ ok: true });
}
