export const config = { maxDuration: 60 };
import nodemailer from 'nodemailer';

const RATE = new Map();
const COUNT_MAP = new Map();

function getJakartaDateStr(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});}
function getJakartaTimestamp(){return new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}

const WA_TARGETS=[
'support@support.whatsapp.com',
'android@support.whatsapp.com',
'iphone@support.whatsapp.com',
'smb@support.whatsapp.com',
'business@support.whatsapp.com',
'smb_web@support.whatsapp.com'
];

function randomPick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function humanizeVariations(){
  const greetings=[
    "Mohon bantuannya segera.",
    "Saya sangat mengandalkan nomor ini untuk kerja.",
    "Terima kasih banyak atas bantuannya.",
    "Saya tunggu balasan secepatnya.",
    "Nomor ini dipakai untuk keluarga dan pekerjaan.",
    "Saya sudah coba beberapa kali tapi tetap gagal.",
    ""
  ];
  const devices=["Android 13 - Samsung A52","iPhone 14 - iOS 17.4","Android 12 - Xiaomi Redmi","iPhone 13 - iOS 16.7"];
  const urg=["","Mohon diprioritaskan.","Urgent - butuh untuk ujian.","Sudah 2 hari tidak bisa login."];
  return {extra: randomPick(greetings), device: randomPick(devices), urgent: randomPick(urg)};
}

const TEMPLATES=[
(nomor,refId,ts,name)=>{
  const h=humanizeVariations();
  return `Prezada Equipe de Suporte do WhatsApp,

Estou com problemas para registrar meu número. Sempre que tento, recebo a mensagem "login indisponível". ${h.urgent}

Este número é muito importante porque o utilizo para fins educacionais e de comunicação como estudante. ${h.extra}

Meu número é ${nomor}
Nome: ${name}
Dispositivo: ${h.device}
Reference ID: ${refId}
Data: ${ts}

Agradeço a atenção e o apoio de todos.`;
},
(nomor,refId,ts,name)=>{
  const h=humanizeVariations();
  return `Dear WhatsApp Support Team,

I am having trouble registering my number. Every time I try, I receive the message "login unavailable". ${h.urgent}

This number is very important to me as I use it for educational and communication purposes as a student. ${h.extra}

My number is ${nomor}
Name: ${name}
Device: ${h.device}
Reference ID: ${refId}
Time: ${ts}

Thank you for your attention and support.`;
},
(nomor,refId,ts,name)=>{
  const h=humanizeVariations();
  return `Kepada Tim Dukungan WhatsApp yang terhormat,

Saya mengalami masalah saat mendaftarkan nomor saya ${nomor}. Setiap kali mencoba, selalu muncul pesan "login tidak tersedia". ${h.urgent}

Nomor ini sangat penting bagi saya karena digunakan untuk keperluan edukasi dan komunikasi sebagai pelajar. ${h.extra}
Perangkat: ${h.device}

Nama Pelapor: ${name}
Nomor: ${nomor}
ID Laporan: ${refId}
Waktu WIB: ${ts}

Terima kasih atas perhatian dan bantuannya.`;
},
(nomor,refId,ts,name)=>{
  const h=humanizeVariations();
  return `Estimado Equipo de Soporte de WhatsApp,

Tengo problemas para registrar mi número ${nomor}. Cada vez que lo intento, aparece el mensaje "inicio de sesión no disponible". ${h.urgent}

Este número es muy importante para mí ya que lo uso con fines educativos y de comunicación como estudiante. ${h.extra}

Nombre: ${name}
Dispositivo: ${h.device}
Número: ${nomor}
Referencia: ${refId}
Fecha: ${ts}

Agradezco su atención y apoyo.`;
},
(nomor,refId,ts,name)=>{
  const h=humanizeVariations();
  return `Chère Équipe d'Assistance WhatsApp,

J'ai des difficultés à enregistrer mon numéro ${nomor}. À chaque tentative, je reçois le message "connexion indisponible". ${h.urgent}

Ce numéro est très important pour moi car je l'utilise à des fins éducatives et de communication en tant qu'étudiant. ${h.extra}

Nom: ${name}
Appareil: ${h.device}
Numéro: ${nomor}
Référence: ${refId}
Date: ${ts}

Je vous remercie de votre attention et de votre soutien.`;
}
];

const SUBJECTS=[
(n,ref)=>`Problema de Login - ${n.slice(-4)} [${ref}]`,
(n,ref)=>`Help Request - Login Unavailable ${ref} - ${randomPick(['Urgent','Help','Support'])}`,
(n,ref)=>`Laporan Kendala Registrasi ${ref} - ${randomPick(['Mohon Bantu','Urgent','Bantuan'])}`,
(n,ref)=>`Solicitud de Soporte - ${n.slice(-4)} [${ref}]`,
(n,ref)=>`Demande d'assistance WhatsApp ${ref}`
];

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  try{
    const ip=(req.headers['x-forwarded-for']?.split(',')[0])||req.socket.remoteAddress||'unknown';
    const now=Date.now();
    if(!RATE.has(ip)) RATE.set(ip,[]);
    let reqs=RATE.get(ip).filter(t=>now-t<600000);
    if(reqs.length>=6) return res.status(429).json({ok:false,error:'Terlalu banyak request, tunggu 2 menit'});
    reqs.push(now);RATE.set(ip,reqs);

    const body=req.body||{};
    // Support both old and new field names to fix bug screenshot
    const nomorWa = body.nomorWa || body.nomor || body.phone || body.targetNumber;
    const targetEmailRaw = body.targetEmail || body.tujuan || body.to;
    const smtpUserRaw = body.smtpUser || body.email;
    const smtpPassRaw = body.smtpPass || body.pass;
    const name = body.name || body.nama;
    let tIdx = body.tIdx;
    let targetIdx = body.targetIdx;

    if(!nomorWa || !targetEmailRaw || !smtpUserRaw || !smtpPassRaw){
      return res.status(400).json({ok:false,error:'Data nomor, tujuan, email, password wajib',debug:{hasNomor:!!nomorWa,hasTujuan:!!targetEmailRaw,hasEmail:!!smtpUserRaw,hasPass:!!smtpPassRaw}});
    }

    const cleanNomor=String(nomorWa).replace(/\D/g,'');
    if(!/^62\d{9,13}$/.test(cleanNomor)) return res.status(400).json({ok:false,error:'Nomor harus format 62 + 9-13 digit'});

    const email=String(smtpUserRaw).trim().toLowerCase();
    const pass=String(smtpPassRaw).replace(/\s/g,'');
    if(!/^[^\s@]+@gmail\.com$/i.test(email)) return res.status(400).json({ok:false,error:'Hanya gmail.com yang didukung'});
    if(pass.length!==16 || !/^[a-z]{16}$/i.test(pass)) return res.status(400).json({ok:false,error:'App password harus 16 huruf a-z'});

    let target=String(targetEmailRaw).trim().toLowerCase();
    // Auto rolling if targetIdx provided but client wants auto
    if(WA_TARGETS.includes(target)){
      // ok
    } else if(target.endsWith('@support.whatsapp.com') || target==='support@whatsapp.com'){
      // ok custom but still whatsapp domain
    } else {
      return res.status(400).json({ok:false,error:'Email tujuan harus email support WhatsApp resmi'});
    }

    const dateStr=getJakartaDateStr();
    const key=`${email}|${dateStr}`;
    const used=COUNT_MAP.get(key)||0;
    if(used>=15) return res.status(429).json({ok:false,error:`Limit 15/hari tercapai untuk ${email}. Reset 00:00 WIB`});

    let idx=parseInt(tIdx);
    if(isNaN(idx)||idx<0||idx>4) idx=used%5;

    const refId=`WA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const ts=getJakartaTimestamp();
    const senderName=(name&&String(name).trim())?String(name).trim():'Pelapor';

    const bodyText=TEMPLATES[idx](cleanNomor,refId,ts,senderName);
    const subject=SUBJECTS[idx](cleanNomor,refId);

    const transporter=nodemailer.createTransport({service:'gmail',auth:{user:email,pass},tls:{rejectUnauthorized:false}});
    await transporter.verify();
    await transporter.sendMail({
      from: `"${senderName}" <${email}>`,
      to: target,
      subject,
      text: bodyText,
      headers:{'X-Reference-Id':refId,'X-Mailer':'FixMerah v3 Anti-Bot'}
    });

    COUNT_MAP.set(key,used+1);

    // Return next target for auto rolling
    let nextTargetIdx = parseInt(targetIdx);
    if(isNaN(nextTargetIdx)) nextTargetIdx = WA_TARGETS.indexOf(target);
    if(nextTargetIdx<0) nextTargetIdx=0;
    nextTargetIdx=(nextTargetIdx+1)%WA_TARGETS.length;

    return res.json({
      ok:true,
      reference:refId,
      template:idx+1,
      sentTo:target,
      nextTarget:WA_TARGETS[nextTargetIdx],
      nextTargetIdx,
      used:used+1,
      limit:15,
      reset:'00:00 WIB',
      message:'Terkirim'
    });

  }catch(err){
    console.error('send error',err);
    const m=err.message||'';
    if(m.includes('Invalid login')||m.includes('535')) return res.status(401).json({ok:false,error:'SMTP login gagal - cek app password & 2FA'});
    return res.status(500).json({ok:false,error:'Gagal kirim: '+m.slice(0,250)});
  }
}
