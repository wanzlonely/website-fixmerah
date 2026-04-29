// Endpoint ini untuk mendaftarkan webhook ke Telegram
// Akses sekali saja: https://website-kamu.vercel.app/api/setup
// Tambahkan ?secret=BOT_TOKEN_KAMU untuk keamanan

export default async function handler(req, res) {
  const BOT_TOKEN  = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const WEBSITE_URL = process.env.WEBSITE_URL;

  if (!BOT_TOKEN || !WEBSITE_URL) {
    return res.status(500).json({ ok: false, error: 'BOT_TOKEN atau WEBSITE_URL belum diisi di Environment Variables' });
  }

  // Validasi secret agar tidak sembarang orang bisa akses
  const { secret } = req.query;
  if (secret !== BOT_TOKEN) {
    return res.status(403).json({ ok: false, error: 'Forbidden. Tambahkan ?secret=BOT_TOKEN di URL' });
  }

  const webhookUrl = `${WEBSITE_URL}/api/webhook`;

  try {
    // Hapus webhook lama dulu
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, { method: 'POST' });

    // Set webhook baru
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    });
    const result = await r.json();

    if (result.ok) {
      return res.json({
        ok: true,
        message: '✅ Webhook berhasil didaftarkan!',
        webhook_url: webhookUrl,
        telegram_response: result
      });
    } else {
      return res.json({ ok: false, error: result.description, telegram_response: result });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
