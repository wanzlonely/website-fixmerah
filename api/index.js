export const config = { maxDuration: 60 };
import fs from 'fs';
import path from 'path';
const TOKEN_FILE = path.join('/tmp', 'fw_tokens.json');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;
function loadTokens(){try{if(fs.existsSync(TOKEN_FILE))return JSON.parse(fs.readFileSync(TOKEN_FILE,'utf8'))}catch{}return{}}
function saveTokens(t){try{fs.writeFileSync(TOKEN_FILE,JSON.stringify(t,null,2))}catch{}}
function cleanExpired(tokens){const now=Date.now();for(const k in tokens)if(tokens[k].expires_at<now)delete tokens[k];return tokens}
function genToken(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let t='';for(let i=0;i<8;i++)t+=c[Math.floor(Math.random()*c.length)];return t}
async function tgSend(id,text){if(!BOT_TOKEN)return;await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:id,text,parse_mode:'Markdown'})})}
export default async function handler(req,res){
res.setHeader('Access-Control-Allow-Origin','*');
res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers','Content-Type');
if(req.method==='OPTIONS')return res.status(200).end();
const {action}=req.query;
try{
if(action==='telegram'&&req.method==='POST'){
const m=req.body.message||req.body.edited_message;if(!m?.text)return res.json({ok:true});
const cid=m.chat.id;const uid=String(m.from.id);const txt=m.text.trim();
if(txt.startsWith('/start')){await tgSend(cid,'*FIXMERAH WALZ BOT*

/token [1-30] - buat token');return res.json({ok:true})}
if(txt.startsWith('/token')){
if(OWNER_ID&&uid!==OWNER_ID){await tgSend(cid,'❌ Hanya owner');return res.json({ok:true})}
let d=parseInt(txt.split(' ')[1]||'7');if(isNaN(d)||d<1||d>30)d=7;
const token=genToken();const exp=Date.now()+d*86400000;
let t=cleanExpired(loadTokens());t[token]={created_at:Date.now(),expires_at:exp,days:d,created_by:uid,used_by:null,used_at:null};saveTokens(t);
const expDate=new Date(exp).toLocaleString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'});
const createdDate=new Date().toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'});
await tgSend(cid,`✅ *TOKEN BARU BERHASIL DIBUAT*

╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🔑 *TOKEN* : \`${token}\`
┃ ⏱️ *DURASI* : *${d} Hari*
┃ 📅 *EXPIRED* : ${expDate}
┃ 👤 *CREATOR* : ${m.from.first_name||'Owner'}
┃ 🕐 *DIBUAT* : ${createdDate}
╰━━━━━━━━━━━━━━━━━━━━━━╯

🌐 *Website:* fixmerah.vercel.app
🔐 *Status:* Siap digunakan

_⚠️ Simpan token dengan aman_`);
return res.json({ok:true})
}
return res.json({ok:true})
}
if(action==='init_bot'){const {secret}=req.query;if(secret!==BOT_TOKEN)return res.status(403).json({ok:false});const url=`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}/api?action=telegram`;const r=await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url)}`);return res.json({ok:true,webhook:await r.json()})}
if(action==='check_token'){const {token}=req.query;if(!token)return res.json({valid:false});const k=token.trim().toUpperCase();let t=cleanExpired(loadTokens());const d=t[k];if(!d)return res.json({valid:false,error:'Token tidak valid'});if(!d.used_by){t[k].used_by=true;t[k].used_at=Date.now();saveTokens(t)}return res.json({valid:true,days:d.days,sisa_hari:Math.ceil((d.expires_at-Date.now())/86400000),expires_at:d.expires_at})}
if(action==='admin_tokens'){const {secret}=req.query;if(secret!==BOT_TOKEN)return res.status(403).json({ok:false});let t=cleanExpired(loadTokens());saveTokens(t);return res.json({ok:true,tokens:t})}
if(action==='verify'&&req.method==='POST'){const {email,pass}=req.body;const nodemailer=await import('nodemailer').then(m=>m.default);const tr=nodemailer.createTransport({service:'gmail',auth:{user:email,pass:pass.replace(/\s/g,'')}});await tr.verify();return res.json({ok:true})}
if(action==='send'&&req.method==='POST'){const {email,pass,nomor}=req.body;const nodemailer=await import('nodemailer').then(m=>m.default);const tr=nodemailer.createTransport({service:'gmail',auth:{user:email,pass:pass.replace(/\s/g,'')}});await tr.sendMail({from:email,to:'support@support.whatsapp.com',subject:'Problema',text:`Nomor: ${nomor}`});return res.json({ok:true})}
return res.status(404).json({error:'Unknown'})
}catch(err){return res.status(500).json({ok:false,error:err.message})}
}