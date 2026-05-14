export const config = { maxDuration: 60 };

import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.join('/tmp', 'fw_tokens.json');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;

function loadTokens(){ try{ if(fs.existsSync(TOKEN_FILE)) return JSON.parse(fs.readFileSync(TOKEN_FILE,'utf8')) }catch{} return {} }
function saveTokens(t){ try{ fs.writeFileSync(TOKEN_FILE, JSON.stringify(t,null,2)) }catch{} }
function cleanExpired(tokens){ const now=Date.now(); for(const k in tokens) if(tokens[k].expires_at < now) delete tokens[k]; return tokens }
function genToken(){ const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let t=''; for(let i=0;i<8;i++) t+=c[Math.floor(Math.random()*c.length)]; return t }

function fmtWIB(ts){
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' WIB';
}

async function tgSend(id, html){
  if(!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id:id, text:html, parse_mode:'HTML', disable_web_page_preview:true })
  });
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  const {action}=req.query;

  try{
    if(action==='telegram' && req.method==='POST'){
      const m = req.body.message || req.body.edited_message;
      if(!m?.text) return res.json({ok:true});

      const cid = m.chat.id;
      const uid = String(m.from.id);
      const txt = m.text.trim();
      const username = m.from.username? '@'+m.from.username : m.from.first_name;

      if(txt.startsWith('/start')){
        await tgSend(cid, `<b>FIXMERAH WALZ BOT</b>\n\nPerintah:\n/token [1-30] - buat token baru\n\nContoh: /token 7`);
        return res.json({ok:true});
      }

      if(txt.startsWith('/token')){
        if(OWNER_ID && uid!== OWNER_ID){
          await tgSend(cid, `❌ <b>Akses Ditolak</b>\nHanya owner yang bisa membuat token.`);
          return res.json({ok:true});
        }

        let d = parseInt(txt.split(' ')[1] || '7');
        if(isNaN(d) || d<1 || d>30) d=7;

        const token = genToken();
        const now = Date.now();
        const exp = now + d*86400000;

        let t = cleanExpired(loadTokens());
        t[token] = { created_at: now, expires_at: exp, days: d, created_by: uid, used_by: null, used_at: null };
        saveTokens(t);

        const pesan =
`✅ <b>TOKEN BARU BERHASIL DIBUAT</b>

🔑 <b>Token:</b>
<code>${token}</code>

⏱️ <b>Durasi:</b> ${d} hari
📅 <b>Dibuat:</b> ${fmtWIB(now)}
⌛ <b>Kadaluarsa:</b> ${fmtWIB(exp)}
👤 <b>Oleh:</b> ${username}
📊 <b>Status:</b> Belum digunakan

<i>Salin token di atas untuk aktivasi.</i>`;

        await tgSend(cid, pesan);
        return res.json({ok:true});
      }
      return res.json({ok:true});
    }

    if(action==='init_bot'){
      const {secret}=req.query; if(secret!==BOT_TOKEN) return res.status(403).json({ok:false});
      const url = `${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}/api?action=telegram`;
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url)}`);
      return res.json({ok:true, webhook: await r.json()});
    }

    if(action==='check_token'){
      const {token}=req.query; if(!token) return res.json({valid:false});
      const k = token.trim().toUpperCase();
      let t = cleanExpired(loadTokens());
      const d = t[k];
      if(!d) return res.json({valid:false, error:'Token tidak valid atau kadaluarsa'});

      if(!d.used_by){ t[k].used_by = true; t[k].used_at = Date.now(); saveTokens(t); }

      const sisa = Math.max(0, Math.ceil((d.expires_at - Date.now())/86400000));
      return res.json({ valid:true, days:d.days, sisa_hari:sisa, expires_at:d.expires_at, expires_wib: fmtWIB(d.expires_at) });
    }

    if(action==='admin_tokens'){
      const {secret}=req.query; if(secret!==BOT_TOKEN) return res.status(403).json({ok:false});
      let t = cleanExpired(loadTokens()); saveTokens(t);
      return res.json({ok:true, total:Object.keys(t).length, tokens:t});
    }

    if(action==='verify' && req.method==='POST'){
      const {email,pass}=req.body;
      const nodemailer = await import('nodemailer').then(m=>m.default);
      const tr = nodemailer.createTransport({service:'gmail', auth:{user:email, pass:pass.replace(/\s/g,'')}});
      await tr.verify(); return res.json({ok:true});
    }

    if(action==='send' && req.method==='POST'){
      const {email,pass,nomor}=req.body;
      const nodemailer = await import('nodemailer').then(m=>m.default);
      const tr = nodemailer.createTransport({service:'gmail', auth:{user:email, pass:pass.replace(/\s/g,'')}});
      await tr.sendMail({from:email, to:'support@support.whatsapp.com', subject:'Problema', text:`Nomor: ${nomor}`});
      return res.json({ok:true});
    }

    return res.status(404).json({error:'Unknown'});
  }catch(err){
    return res.status(500).json({ok:false, error:err.message});
  }
}