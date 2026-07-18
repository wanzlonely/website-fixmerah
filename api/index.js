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

function getHumanTouch(lang){
  const devices=[
    "Android 13 - Samsung Galaxy A52",
    "Android 14 - Xiaomi Redmi Note 12",
    "iPhone 14 - iOS 17.4.1",
    "iPhone 13 - iOS 16.7.8",
    "Android 13 - Infinix Hot 40",
    "Samsung Galaxy S23 - Android 14"
  ];
  const extras = {
    pt: ["Aguardo retorno breve.", "Este número é essencial para meus estudos.", "Já tentei reinstalar o WhatsApp e limpar o cache.", "Utilizo este número há mais de 3 anos.", ""],
    en: ["I have already tried reinstalling the app.", "This number is linked to my university account.", "I have been using this number for years.", "Kindly prioritize this request.", ""],
    id: ["Saya sudah mencoba instal ulang WhatsApp.", "Nomor ini terhubung dengan akun belajar saya.", "Mohon bantuannya segera, terima kasih.", "Saya sangat mengandalkan nomor ini untuk kuliah.", ""],
    es: ["Ya intenté reinstalar WhatsApp y borrar caché.", "Este número está vinculado a mis estudios.", "Llevo años usando este número.", "Agradecería una respuesta pronta.", ""],
    fr: ["J'ai déjà essayé de réinstaller WhatsApp.", "Ce numéro est lié à mes études.", "J'utilise ce numéro depuis plusieurs années.", "Merci de traiter ma demande en priorité.", ""]
  };
  const urgents = {
    pt: ["", "Peço priorização, por favor.", "Preciso com urgência para provas.", "Já faz 2 dias que não consigo acessar."],
    en: ["", "Please prioritize, it's urgent for my exams.", "It's been 2 days without access.", "I need this for my final project."],
    id: ["", "Mohon diprioritaskan, untuk ujian saya.", "Sudah 2 hari tidak bisa login.", "Sangat urgent untuk tugas akhir."],
    es: ["", "Por favor, priorice mi caso, es para exámenes.", "Llevo 2 días sin acceso.", "Es urgente para mi proyecto final."],
    fr: ["", "Merci de prioriser, c'est pour mes examens.", "Cela fait 2 jours que je n'ai plus accès.", "C'est urgent pour mon projet de fin d'études."]
  };
  return {
    device: randomPick(devices),
    extra: randomPick(extras[lang] || extras.en),
    urgent: randomPick(urgents[lang] || urgents.en)
  };
}

const TEMPLATES=[
(nomor,refId,ts,name)=>{
  const h=getHumanTouch('pt');
  return `Prezada Equipe de Suporte do WhatsApp,

Estou com problemas para registrar meu número. Sempre que tento, recebo a mensagem "login indisponível". ${h.urgent}

Este número é muito importante porque o utilizo para fins educacionais e de comunicação como estudante. ${h.extra}

Meu número é ${nomor}
Nome: ${name}
Dispositivo: ${h.device}
ID de Referência: ${refId}
Data/Hora (WIB): ${ts}

Espero sinceramente que a equipe do WhatsApp possa ajudar a resolver este problema o mais rápido possível para que eu possa usá-lo novamente no WhatsApp. Agradeço a atenção e o apoio de todos.

Atenciosamente,
${name}`;
},
(nomor,refId,ts,name)=>{
  const h=getHumanTouch('en');
  return `Dear WhatsApp Support Team,

I am having trouble registering my number. Whenever I try, I receive the message "login unavailable". ${h.urgent}

This number is very important because I use it for educational and communication purposes as a student. ${h.extra}

My number is ${nomor}
Name: ${name}
Device: ${h.device}
Reference ID: ${refId}
Date/Time (WIB): ${ts}

I sincerely hope the WhatsApp team can help resolve this issue as soon as possible so I can use it again on WhatsApp. Thank you for your attention and support.

Best regards,
${name}`;
},
(nomor,refId,ts,name)=>{
  const h=getHumanTouch('id');
  return `Kepada Tim Dukungan WhatsApp yang Terhormat,

Saya mengalami masalah saat mendaftarkan nomor saya. Setiap kali mencoba, selalu muncul pesan "login tidak tersedia". ${h.urgent}

Nomor ini sangat penting karena saya gunakan untuk keperluan edukasi dan komunikasi sebagai pelajar. ${h.extra}

Nomor saya adalah ${nomor}
Nama: ${name}
Perangkat: ${h.device}
ID Referensi: ${refId}
Waktu (WIB): ${ts}

Saya sangat berharap tim WhatsApp dapat membantu menyelesaikan masalah ini secepat mungkin agar saya dapat menggunakannya kembali di WhatsApp. Terima kasih atas perhatian dan dukungannya.

Hormat saya,
${name}`;
},
(nomor,refId,ts,name)=>{
  const h=getHumanTouch('es');
  return `Estimado Equipo de Soporte de WhatsApp,

Tengo problemas para registrar mi número. Siempre que lo intento, recibo el mensaje "inicio de sesión no disponible". ${h.urgent}

Este número es muy importante porque lo utilizo con fines educativos y de comunicación como estudiante. ${h.extra}

Mi número es ${nomor}
Nombre: ${name}
Dispositivo: ${h.device}
ID de Referencia: ${refId}
Fecha/Hora (WIB): ${ts}

Espero sinceramente que el equipo de WhatsApp pueda ayudarme a resolver este problema lo antes posible para que pueda volver a usarlo en WhatsApp. Agradezco su atención y apoyo.

Atentamente,
${name}`;
},
(nomor,refId,ts,name)=>{
  const h=getHumanTouch('fr');
  return `Chère Équipe d'Assistance WhatsApp,

Je rencontre des difficultés pour enregistrer mon numéro. À chaque tentative, je reçois le message "connexion indisponible". ${h.urgent}

Ce numéro est très important car je l'utilise à des fins éducatives et de communication en tant qu'étudiant. ${h.extra}

Mon numéro est ${nomor}
Nom: ${name}
Appareil: ${h.device}
ID de Référence: ${refId}
Date/Heure (WIB): ${ts}

J'espère sincèrement que l'équipe WhatsApp pourra m'aider à résoudre ce problème le plus rapidement possible afin que je puisse à nouveau l'utiliser sur WhatsApp. Merci pour votre attention et votre soutien.

Cordialement,
${name}`;
}
];

const SUBJECTS=[
(n,ref)=>`Problema de Login - ${n.slice(-4)} [${ref}] - Suporte Estudantil`,
(n,ref)=>`Login Issue - ${n.slice(-4)} [${ref}] - Student Support Request`,
(n,ref)=>`Kendala Login ${n.slice(-4)} [${ref}] - Bantuan Akun Pelajar`,
(n,ref)=>`Problema de Inicio de Sesión - ${n.slice(-4)} [${ref}] - Soporte Estudiantil`,
(n,ref)=>`Problème de Connexion - ${n.slice(-4)} [${ref}] - Support Étudiant`
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
    if(!/^\d{7,15}$/.test(cleanNomor)) return res.status(400).json({ok:false,error:'Nomor harus 7-15 digit angka beserta kode negara'});

    const email=String(smtpUserRaw).trim().toLowerCase();
    const pass=String(smtpPassRaw).replace(/\s/g,'');
    if(!/^[^\s@]+@gmail\.com$/i.test(email)) return res.status(400).json({ok:false,error:'Hanya gmail.com yang didukung'});
    if(pass.length!==16 || !/^[a-z]{16}$/i.test(pass)) return res.status(400).json({ok:false,error:'App password harus 16 huruf a-z'});

    let target=String(targetEmailRaw).trim().toLowerCase();
    if(WA_TARGETS.includes(target)){
    } else if(target.endsWith('@support.whatsapp.com')){
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
      headers:{'X-Reference-Id':refId,'X-Mailer':'FixMerah v3.1 Perfect Auto'}
    });

    COUNT_MAP.set(key,used+1);

    let nextTargetIdx = parseInt(targetIdx);
    if(isNaN(nextTargetIdx)) nextTargetIdx = WA_TARGETS.indexOf(target);
    if(nextTargetIdx<0) nextTargetIdx=0;
    nextTargetIdx=(nextTargetIdx+1)%WA_TARGETS.length;

    return res.json({
      ok:true,
      reference:refId,
      template:idx+1,
      templateLang:["pt","en","id","es","fr"][idx],
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