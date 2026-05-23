export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    if (action === 'check_token') {
      const { token } = req.query;
      if (!token) return res.json({ valid: false });
      const k = token.trim().toUpperCase();
      if (k === 'WALZ999') return res.json({ valid: true });
      return res.json({ valid: false, error: 'Token tidak valid' });
    }

    if (action === 'verify' && req.method === 'POST') {
      const { email, pass } = req.body;
      const nodemailer = await import('nodemailer').then(m => m.default);
      const tr = nodemailer.createTransport({ service: 'gmail', auth: { user: email, pass: pass.replace(/\s/g, '') } });
      await tr.verify();
      return res.json({ ok: true });
    }

    if (action === 'send' && req.method === 'POST') {
      const { email, pass, nomor } = req.body;
      const nodemailer = await import('nodemailer').then(m => m.default);
      const tr = nodemailer.createTransport({ service: 'gmail', auth: { user: email, pass: pass.replace(/\s/g, '') } });
      await tr.sendMail({ from: email, to: 'support@support.whatsapp.com', subject: 'Problema', text: `Nomor: ${nomor}` });
      return res.json({ ok: true });
    }

    return res.status(404).json({ error: 'Unknown' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
