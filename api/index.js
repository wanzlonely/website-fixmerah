export const config={maxDuration:60};
import fs from 'fs';
import path from 'path';
const TOKEN_FILE=path.join('/tmp','fw_tokens.json');
const BOT_TOKEN=process.env.TELEGRAM_BOT_TOKEN||process.env.BOT_TOKEN;
const OWNER_ID=process.env.OWNER_TELEGRAM_ID;
const WA_AUTH_DIR='/tmp/wa_auth';
function loadTokens(){try{if(fs.existsSync(TOKEN_FILE))return JSON.parse(fs.readFileSync(TOKEN_FILE,'utf8'))}catch{}return{}}
function saveTokens(t){try{fs.writeFileSync(TOKEN_FILE,JSON.stringify(t,null,2))}catch{}}
function cleanExpired(tokens){const now=Date.now();for(const k in tokens)if(tokens[k].expires_at<now)delete tokens[k];return tokens}
function genToken(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let t='';for(let i=0;i<8;i++)t+=c[Math.floor(Math.random()*c.length)];return t}
async function tgSend(id,text){if(!BOT_TOKEN)return;await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:id,text,parse_mode:'Markdown'})})}
function clearWAAuth(){try{fs.rmSync(WA_AUTH_DIR,{recursive:true,force:true})}catch{}}
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
if(txt.startsWith('/token')){if(OWNER_ID&&uid!==OWNER_ID){await tgSend(cid,'❌ Hanya owner');return res.json({ok:true})}let d=parseInt(txt.split(' ')[1]||'7');if(isNaN(d)||d<1||d>30)d=7;const token=genToken();const exp=Date.now()+d*86400000;let t=cleanExpired(loadTokens());t[token]={created_at:Date.now(),expires_at:exp,days:d,created_by:uid,used_by:null,used_at:null};saveTokens(t);await tgSend(cid,`✅ *Token Baru*

\`${token}\`

⏱ ${d} hari`);return res.json({ok:true})}
return res.json({ok:true})
}
if(action==='init_bot'){const {secret}=req.query;if(secret!==BOT_TOKEN)return res.status(403).json({ok:false});const url=`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}/api?action=telegram`;const r=await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url)}`);return res.json({ok:true,webhook:await r.json()})}
if(action==='check_token'){const {token}=req.query;if(!token)return res.json({valid:false});const k=token.trim().toUpperCase();let t=cleanExpired(loadTokens());const d=t[k];if(!d)return res.json({valid:false,error:'Token tidak valid'});if(!d.used_by){t[k].used_by=true;t[k].used_at=Date.now();saveTokens(t)}return res.json({valid:true,days:d.days,sisa_hari:Math.ceil((d.expires_at-Date.now())/86400000),expires_at:d.expires_at})}
if(action==='admin_tokens'){const {secret}=req.query;if(secret!==BOT_TOKEN)return res.status(403).json({ok:false});let t=cleanExpired(loadTokens());saveTokens(t);return res.json({ok:true,tokens:t})}
if(action==='verify'&&req.method==='POST'){const {email,pass}=req.body;const nodemailer=await import('nodemailer').then(m=>m.default);const tr=nodemailer.createTransport({service:'gmail',auth:{user:email,pass:pass.replace(/\s/g,'')}});await tr.verify();return res.json({ok:true})}
if(action==='send'&&req.method==='POST'){const {email,pass,nomor}=req.body;const nodemailer=await import('nodemailer').then(m=>m.default);const tr=nodemailer.createTransport({service:'gmail',auth:{user:email,pass:pass.replace(/\s/g,'')}});await tr.sendMail({from:email,to:'support@support.whatsapp.com',subject:'Problema',text:`Nomor: ${nomor}`});return res.json({ok:true})}
if(action==='wa_pair_vercel'&&req.method==='POST'){const {number}=req.body;const baileys=await import('@whiskeysockets/baileys');const {useMultiFileAuthState,makeWASocket,fetchLatestBaileysVersion}=baileys;const pino=await import('pino').then(m=>m.default);const logger=pino({level:'silent'});const {state,saveCreds}=await useMultiFileAuthState(WA_AUTH_DIR);const {version}=await fetchLatestBaileysVersion();const sock=makeWASocket({version,auth:state,logger,printQRInTerminal:false,browser:['Fixmerah','Chrome','1.0']});sock.ev.on('creds.update',saveCreds);const cleanNum=number.replace(/[^0-9]/g,'');const code=await sock.requestPairingCode(cleanNum);res.json({ok:true,code});await new Promise(r=>setTimeout(r,55000));try{sock.end()}catch{};return}
if(action==='wa_logout_vercel'){clearWAAuth();return res.json({ok:true})}
if(action==='wa_check_vercel'&&req.method==='POST'){const {numbers}=req.body;const batch=numbers.slice(0,30);const baileys=await import('@whiskeysockets/baileys');const {useMultiFileAuthState,makeWASocket,fetchLatestBaileysVersion,DisconnectReason}=baileys;const pino=await import('pino').then(m=>m.default);const logger=pino({level:'silent'});const {state,saveCreds}=await useMultiFileAuthState(WA_AUTH_DIR);const {version}=await fetchLatestBaileysVersion();const sock=makeWASocket({version,auth:state,logger,syncFullHistory:false});sock.ev.on('creds.update',saveCreds);let connected=false;await new Promise(r=>{const to=setTimeout(r,15000);sock.ev.on('connection.update',u=>{if(u.connection==='open'){connected=true;clearTimeout(to);r()}if(u.connection==='close'){const c=u.lastDisconnect?.error?.output?.statusCode;if(c===DisconnectReason.loggedOut||c===401)clearWAAuth();clearTimeout(to);r()}})});if(!connected||!sock.user){try{sock.end()}catch{};return res.json({ok:false,error:'WA tidak terhubung',needPair:true})}const results=[];const conc=5;for(let i=0;i<batch.length;i+=conc){const chunk=batch.slice(i,i+conc);await Promise.all(chunk.map(async raw=>{const jid=raw.replace(/[^0-9]/g,'')+'@s.whatsapp.net';try{const [ex]=await sock.onWhatsApp(jid);if(!ex?.exists){results.push({number:raw,exists:false});return}const [pp,st,bz]=await Promise.all([sock.profilePictureUrl(jid,'image').then(()=>true).catch(()=>false),sock.fetchStatus(jid).catch(()=>({})),sock.getBusinessProfile(jid).catch(()=>null)]);results.push({number:raw,exists:true,hasPp:pp,bio:st?.status||'',bioSetAt:st?.setAt||null,isBusiness:!!bz,verifiedName:bz?.verifiedName||''})}catch(e){results.push({number:raw,exists:false,error:e.message})}}))}try{sock.end()}catch{};return res.json({ok:true,results,count:results.length})}
return res.status(404).json({error:'Unknown'})
}catch(err){return res.status(500).json({ok:false,error:err.message})}
}
