import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.join('/tmp', 'fw_tokens.json');

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch {}
  return {};
}

function saveTokens(tokens) {
  try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2)); } catch {}
}

function cleanExpired(tokens) {
  const now = Date.now();
  for (const key in tokens) { if (tokens[key].expires_at < now) delete tokens[key]; }
  return tokens;
}

export default async function handler(req, res) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  const { action } = req.query;

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {

    /* ── REGISTER TOKEN (called by bot after generating) ── */
    if (action === 'register_token') {
      const { token, secret, days, created_by } = req.query;
      if (!token) return res.status(400).json({ ok:false, error:'Missing token' });
      if (secret !== BOT_TOKEN) return res.status(403).json({ ok:false, error:'Forbidden' });

      const d = parseInt(days || '7');
      const expires_at = Date.now() + d * 86_400_000;

      let tokens = cleanExpired(loadTokens());
      tokens[token] = {
        created_at: Date.now(),
        expires_at,
        days: d,
        created_by: created_by || null,
        used_by: null,
        used_at: null,
        username: null
      };
      saveTokens(tokens);
      return res.json({ ok:true });
    }

    /* ── CHECK TOKEN (called by website login) ── */
    if (action === 'check_token') {
      const { token } = req.query;
      if (!token) return res.json({ valid:false, error:'Token kosong' });

      const key = token.trim().toUpperCase();
      let tokens = cleanExpired(loadTokens());

      const data = tokens[key];
      if (!data) return res.json({ valid:false, error:'Token tidak valid atau sudah kedaluwarsa' });

      const sisa_hari = Math.ceil((data.expires_at - Date.now()) / 86_400_000);

      // Mark as used if first time
      if (!data.used_by) {
        tokens[key].used_by   = true;
        tokens[key].used_at   = Date.now();
        saveTokens(tokens);
      }

      return res.json({
        valid: true,
        days: data.days,
        sisa_hari,
        expires_at: data.expires_at
      });
    }

    /* ── SAVE TOKEN FROM BOT FILE (sync bot tokens to vercel) ── */
    if (action === 'sync_tokens') {
      const { secret } = req.query;
      if (secret !== BOT_TOKEN) return res.status(403).json({ ok:false, error:'Forbidden' });
      if (req.method !== 'POST') return res.status(405).json({ ok:false });

      const incoming = req.body;
      if (!incoming || typeof incoming !== 'object') return res.status(400).json({ ok:false });

      let tokens = loadTokens();
      Object.assign(tokens, incoming);
      tokens = cleanExpired(tokens);
      saveTokens(tokens);
      return res.json({ ok:true, total: Object.keys(tokens).length });
    }

    /* ── ADMIN: list tokens ── */
    if (action === 'admin_tokens') {
      const { secret } = req.query;
      if (secret !== BOT_TOKEN) return res.status(403).json({ ok:false });
      let tokens = cleanExpired(loadTokens());
      saveTokens(tokens);
      return res.json({ ok:true, tokens });
    }

    /* ── VERIFY GMAIL CREDENTIAL ── */
    if (action === 'verify' && req.method === 'POST') {
      const { email, pass } = req.body;
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: email, pass: pass.replace(/\s/g, '') }
      });
      await transporter.verify();
      return res.json({ ok: true });
    }

    /* ── SEND EMAIL ── */
    if (action === 'send' && req.method === 'POST') {
      const { email, pass, nomor, lang = 'pt' } = req.body;

      const templates = {
        pt: `Prezada Equipe de Suporte do WhatsApp,\n\nEstou com problemas para registrar meu número. Recebo a mensagem "login indisponível".\n\nEste número é importante para meus estudos.\n\nMeu número: ${nomor}\n\nObrigado.`,
        en: `Dear WhatsApp Support,\n\nI am unable to register my number. I keep receiving the "login unavailable" message.\n\nMy number: ${nomor}\n\nThank you.`,
        id: `Tim Support WhatsApp,\n\nSaya tidak dapat mendaftarkan nomor saya. Muncul pesan "login tidak tersedia".\n\nNomor: ${nomor}\n\nTerima kasih.`
      };

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: email, pass: pass.replace(/\s/g, '') }
      });

      await transporter.sendMail({
        from:    email,
        to:      'support@support.whatsapp.com',
        subject: 'Problema de registro - WhatsApp',
        text:    templates[lang] ?? templates.pt
      });

      return res.json({ ok: true });
    }

    return res.status(404).json({ error: 'Unknown action' });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
