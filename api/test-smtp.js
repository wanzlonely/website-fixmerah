export const config = { maxDuration: 30 };
import nodemailer from 'nodemailer';
const RATE = new Map();
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  try{
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const now=Date.now();
    if(!RATE.has(ip)) RATE.set(ip,[]);
    let arr=RATE.get(ip).filter(t=>now-t<60000);
    if(arr.length>=8) return res.status(429).json({ok:false,error:'Terlalu banyak cek, tunggu 1 menit'});
    arr.push(now);RATE.set(ip,arr);
    const body=req.body||{};
    const smtpUser = body.smtpUser || body.email;
    const smtpPass = body.smtpPass || body.pass;
    if(!smtpUser||!smtpPass) return res.status(400).json({ok:false,error:'Email dan app password wajib'});
    const email=String(smtpUser).trim().toLowerCase();
    const pass=String(smtpPass).replace(/\s/g,'');
    if(!/^[^\s@]+@gmail\.com$/i.test(email)) return res.status(400).json({ok:false,error:'Hanya gmail.com yang didukung'});
    if(pass.length!==16) return res.status(400).json({ok:false,error:`App password harus 16 karakter, kamu kirim ${pass.length}`});
    if(!/^[a-z]{16}$/i.test(pass)) return res.status(400).json({ok:false,error:'Format harus 16 huruf a-z'});
    const transporter=nodemailer.createTransport({service:'gmail',auth:{user:email,pass},tls:{rejectUnauthorized:false}});
    await transporter.verify();
    return res.json({ok:true,message:'Koneksi SMTP Gmail valid (real check)'});
  }catch(err){
    console.error('test-smtp',err.message);
    const msg=err.message||'';
    if(msg.includes('Invalid login')||msg.includes('535')||msg.includes('Username and Password not accepted')){
      return res.status(401).json({ok:false,error:'Login gagal - App password salah atau 2FA belum aktif'});
    }
    return res.status(400).json({ok:false,error:'Verifikasi gagal: '+msg.slice(0,180)});
  }
}
