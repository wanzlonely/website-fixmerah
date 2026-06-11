export const config = {
  maxDuration: 60
};

const RATE_LIMIT = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!RATE_LIMIT.has(ip)) RATE_LIMIT.set(ip, []);
    let requests = RATE_LIMIT.get(ip).filter(t => now - t < 600000);
    
    if (requests.length >= 4) {
      return res.status(429).json({ 
        ok: false, 
        error: 'Terlalu banyak permintaan. Silakan tunggu beberapa menit.' 
      });
    }
    
    requests.push(now);
    RATE_LIMIT.set(ip, requests);

    if (action === 'check_token') {
      const { token } = req.query;
      const k = token ? token.trim().toUpperCase() : '';
      return res.json({ valid: k === 'WALZ999' });
    }

    if (action === 'send' && req.method === 'POST') {
      const { email, pass, nomor } = req.body;

      if (!email || !pass || !nomor) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Data email, password, dan nomor wajib diisi' 
        });
      }

      const nodemailer = await import('nodemailer').then(m => m.default);
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: email,
          pass: pass.replace(/\s/g, '')
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const refId = `WA-${Date.now().toString(36).toUpperCase()}`;
      const timestamp = new Date().toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const templates = [
        `Prezada Equipe de Suporte do WhatsApp,

Estou com problemas para registrar meu número. Sempre que tento, recebo a mensagem "login indisponível". 

Este número é muito importante porque o utilizo para fins educacionais e de comunicação como estudante. 

Número: ${nomor}
Reference ID: ${refId}
Data: ${timestamp}

Espero sinceramente que a equipe do WhatsApp possa ajudar a resolver este problema o mais rápido possível para que eu possa usá-lo novamente no WhatsApp.

Agradeço a atenção e o apoio de todos.`,

        `Olá, Equipe de Suporte WhatsApp,

Gostaria de relatar um problema de registro no meu número ${nomor}. 
Ao tentar fazer login, aparece constantemente a mensagem "login indisponível".

Utilizo este número para estudos e comunicação diária. Peço gentilmente a ajuda de vocês para normalizar minha conta.

Referência: ${refId}
Horário: ${timestamp}

Obrigado pela compreensão e pelo suporte.`,

        `Yth. Tim Support WhatsApp,

Saya mengalami masalah "login tidak tersedia" ketika mencoba mendaftarkan nomor ${nomor}.

Nomor ini sangat penting untuk keperluan pendidikan dan komunikasi saya sebagai mahasiswa. 

Mohon bantuan agar kendala ini dapat segera diselesaikan.

ID Laporan: ${refId}
Waktu: ${timestamp}

Terima kasih atas perhatiannya.`,

        `Prezados Suportes do WhatsApp,

Venho por meio deste relatar que estou impossibilitado de acessar minha conta devido à mensagem "login indisponível" ao tentar registrar o número ${nomor}.

Este número é utilizado para fins acadêmicos e contato familiar. Agradeço desde já pela atenção especial ao meu caso.

Referência: ${refId}
Data/Hora: ${timestamp}`,

        `Dear WhatsApp Support Team,

I am having trouble registering my number ${nomor}. Every time I try, I get the message "login indisponível".

This number is very important for my educational purposes and daily communication as a student.

Reference ID: ${refId}
Time: ${timestamp}

I kindly ask for your help to resolve this issue as soon as possible.

Thank you for your attention.`
      ];

      const subjects = [
        `Problema de Login - ${nomor.slice(-4)}`,
        `Solicitação de Ajuda - Login Indisponível`,
        `Relato de Restrição de Conta ${refId}`,
        `Pedido de Suporte - Registro WhatsApp`,
        `Problema ao Registrar Número`
      ];

      const selectedBody = templates[Math.floor(Math.random() * templates.length)];
      const selectedSubject = subjects[Math.floor(Math.random() * subjects.length)];

      await transporter.sendMail({
        from: email,
        to: 'support@support.whatsapp.com',
        subject: selectedSubject,
        text: selectedBody
      });

      await new Promise(r => setTimeout(r, 2000 + Math.random() * 6000));

      return res.json({ 
        ok: true, 
        reference: refId, 
        message: 'Email berhasil dikirim' 
      });
    }

    return res.status(404).json({ error: 'Action tidak dikenal' });

  } catch (err) {
    console.error('Handler Error:', err.message);
    return res.status(500).json({ 
      ok: false, 
      error: 'Terjadi kesalahan saat memproses permintaan' 
    });
  }
}