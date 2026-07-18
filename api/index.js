export const config = { maxDuration: 60 };
import nodemailer from 'nodemailer';

const RATE = new Map();
const COUNT_MAP = new Map(); // key: email|dateJakarta -> count

function getJakartaDateStr(){
  return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
}
function getJakartaTimestamp(){
  return new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

const ALLOWED_TARGETS = [
  'support@whatsapp.com',
  'support@support.whatsapp.com',
  'android@support.whatsapp.com',
  'iphone@support.whatsapp.com',
  'smb@support.whatsapp.com',
  'business@support.whatsapp.com',
  'smb_web@support.whatsapp.com'
];

const TEMPLATES = [
  (nomor, refId, ts, name) => `Prezada Equipe de Suporte do WhatsApp,

Estou com problemas para registrar meu número. Sempre que tento, recebo a mensagem "login indisponível".

Este número é muito importante porque o utilizo para fins educacionais e de comunicação como estudante. Espero sinceramente que a equipe do WhatsApp possa ajudar a resolver este problema o mais rápido possível.

Meu número é ${nomor}
Nome: ${name}
Reference ID: ${refId}
Data: ${ts}

Agradeço a atenção e o apoio de todos.`,
  (nomor, refId, ts, name) => `Dear WhatsApp Support Team,

I am having trouble registering my number. Every time I try, I receive the message "login unavailable". This number is very important to me as I use it for educational and communication purposes as a student.

My number is ${nomor}
Name: ${name}
Reference ID: ${refId}
Time: ${ts}

Thank you for your attention and support.`,
  (nomor, refId, ts, name) => `Kepada Tim Dukungan WhatsApp,

Saya mengalami masalah saat mendaftarkan nomor saya ${nomor}. Setiap kali mencoba, selalu muncul pesan "login tidak tersedia".

Nomor ini sangat penting bagi saya karena digunakan untuk keperluan edukasi dan komunikasi sebagai pelajar. Saya sangat berharap tim WhatsApp dapat membantu menyelesaikan masalah ini sesegera mungkin.

Nama Pelapor: ${name}
Nomor: ${nomor}
ID Laporan: ${refId}
Waktu WIB: ${ts}

Terima kasih atas perhatian dan bantuannya.`,
  (nomor, refId, ts, name) => `Estimado Equipo de Soporte de WhatsApp,

Tengo problemas para registrar mi número ${nomor}. Cada vez que lo intento, aparece el mensaje "inicio de sesión no disponible". Este número es muy importante para mí ya que lo uso con fines educativos y de comunicación como estudiante.

Nombre: ${name}
Número: ${nomor}
Referencia: ${refId}
Fecha: ${ts}

Agradezco su atención y apoyo.`,
  (nomor, refId, ts, name) => `Chère Équipe d'Assistance WhatsApp,

J'ai des difficultés à enregistrer mon numéro ${nomor}. À chaque tentative, je reçois le message "connexion indisponible". Ce numéro est très important pour moi car je l'utilise à des fins éducatives et de communication en tant qu'étudiant.

Nom: ${name}
Numéro: ${nomor}
Référence: ${refId}
Date: ${ts}

Je vous remercie de votre attention et de votre soutien.`
];

const SUBJECTS = [
  (n,ref)=>`Problema de Login - ${n.slice(-4)} [${ref}]`,
  (n,ref)=>`Help Request - Login Unavailable ${ref}`,
  (n,ref)=>`Laporan Kendala Registrasi ${ref}`,
  (n,ref)=>`Solicitud de Soporte - ${n.slice(-4)}`,
  (n,ref)=>`Demande d'assistance WhatsApp ${ref}`
];

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  try{
    const ip = (req.headers['x-forwarded-for']?.split(',')[0]) || req.socket.remoteAddress || 'unknown';
    const now=Date.now();
    if(!RATE.has(ip)) RATE.set(ip,[]);
    let reqs=RATE.get(ip).filter(t=>now-t<600000);
    if(reqs.length>=6) return res.status(429).json({ok:false,error:'Terlalu banyak request, tunggu 2 menit'});
    reqs.push(now);RATE.set(ip,reqs);

    const {name, nomorWa, targetEmail, smtpUser, smtpPass, tIdx} = req.body || {};

    if(!nomorWa || !targetEmail || !smtpUser || !smtpPass){
      return res.status(400).json({ok:false,error:'Data nomor, tujuan, email, password wajib'});
    }

    const cleanNomor = String(nomorWa).replace(/\D/g,'');
    if(!/^62\d{9,13}$/.test(cleanNomor)){
      return res.status(400).json({ok:false,error:'Nomor harus format 62 + 9-13 digit'});
    }

    const email = String(smtpUser).trim().toLowerCase();
    const pass = String(smtpPass).replace(/\s/g,'');

    if(!/^[^\s@]+@gmail\.com$/i.test(email)){
      return res.status(400).json({ok:false,error:'Hanya gmail.com yang didukung di SMTP pool'});
    }
    if(pass.length!==16 || !/^[a-z]{16}$/i.test(pass)){
      return res.status(400).json({ok:false,error:'App password harus 16 huruf a-z'});
    }

    const target = String(targetEmail).trim().toLowerCase();
    const isAllowed = ALLOWED_TARGETS.includes(target) || target.endsWith('@support.whatsapp.com') || target==='support@whatsapp.com';
    if(!isAllowed){
      return res.status(400).json({ok:false,error:'Email tujuan harus email support WhatsApp resmi yang aktif (contoh: support@whatsapp.com, android@support.whatsapp.com, smb@support.whatsapp.com)'});
    }

    const dateStr = getJakartaDateStr();
    const key = `${email}|${dateStr}`;
    const used = COUNT_MAP.get(key) || 0;
    if(used>=15){
      return res.status(429).json({ok:false,error:`Limit 15/hari tercapai untuk ${email}. Reset jam 00:00 WIB (${dateStr})`});
    }

    let idx = parseInt(tIdx);
    if(isNaN(idx) || idx<0 || idx>4) idx = used % 5;

    const refId = `WA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const ts = getJakartaTimestamp();
    const senderName = (name && String(name).trim()) ? String(name).trim() : 'Pelapor';

    const body = TEMPLATES[idx](cleanNomor, refId, ts, senderName);
    const subject = SUBJECTS[idx](cleanNomor, refId);

    const transporter = nodemailer.createTransport({
      service:'gmail',
      auth:{user:email, pass},
      tls:{rejectUnauthorized:false}
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"${senderName}" <${email}>`,
      to: target,
      subject,
      text: body,
      headers:{
        'X-Reference-Id': refId,
        'X-Mailer': 'FixMerah Pro Sender'
      }
    });

    COUNT_MAP.set(key, used+1);

    return res.json({ok:true,reference:refId,template:idx+1,used:used+1,limit:15,reset:'00:00 WIB',message:'Terkirim ke '+target});

  }catch(err){
    console.error('send error',err);
    const m = err.message||'';
    if(m.includes('Invalid login') || m.includes('535')){
      return res.status(401).json({ok:false,error:'SMTP login gagal - cek app password 16 char & 2FA'});
    }
    return res.status(500).json({ok:false,error:'Gagal kirim: '+m.slice(0,250)});
  }
}
