import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.join('/tmp', 'fw_tokens.json');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;
const WA_AUTH_DIR = '/tmp/wa_auth';

function loadTokens() { try { if (fs.existsSync(TOKEN_FILE)) return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); } catch {} return {}; }
function saveTokens(t) { try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2)); } catch {} }
function cleanExpired(tokens) { const now = Date.now(); for (const k in tokens) if (tokens[k].expires_at < now) delete tokens[k]; return tokens; }
function genToken() { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let t=''; for(let i=0;i<8;i++) t+=chars[Math.floor(Math.random()*chars.length)]; return t; }
async function tgSend(chat_id, text){ if(!BOT_TOKEN) return; await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id,text,parse_mode:'Markdown'})}); }
function clearWAAuth(){ try{ fs.rmSync(WA_AUTH_DIR,{recursive:true,force:true}); }catch{} }

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  const {action}=req.query;
  try{
    
    if(action==='telegram' && req.method==='POST'){
      const msg=req.body.message||req.body.edited_message; if(!msg?.text) return res.json({ok:true});
      const chat_id=msg.chat.id; const user_id=String(msg.from.id); const text=msg.text.trim();
      if(text.startsWith('/start')){ await tgSend(chat_id,`*FIXMERAH WALZ BOT*

/token [1-30] - buat token`); return res.json({ok:true}); }
      if(text.startsWith('/token')){ if(OWNER_ID && user_id!==OWNER_ID){await tgSend(chat_id,'❌ Bukan owner');return res.json({ok:true});} let days=parseInt(text.split(' ')[1]||'7'); if(isNaN(days)||days<1||days>30) days=7; const token=genToken(); const expires_at=Date.now()+days*86400000; let tokens=cleanExpired(loadTokens()); tokens[token]={created_at:Date.now(),expires_at,days,created_by:user_id,used_by:null,used_at:null}; saveTokens(tokens); const expDate=new Date(expires_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}); await tgSend(chat_id,`✅ *Token Baru*

\`${token}\`

⏱ ${days} hari
📅 ${expDate} WIB`); return res.json({ok:true}); }
      return res.json({ok:true});
    }
    if(action==='init_bot'){ const {secret}=req.query; if(secret!==BOT_TOKEN) return res.status(403).json({ok:false}); const url=`${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}/api?action=telegram`; const r=await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url)}`); return res.json({ok:true,webhook:await r.json()}); }
    if(action==='register_token'){ const {token,secret,days,created_by}=req.query; if(secret!==BOT_TOKEN) return res.status(403).json({ok:false}); const d=Math.min(30,Math.max(1,parseInt(days||'7'))); let tokens=cleanExpired(loadTokens()); tokens[token.toUpperCase()]={created_at:Date.now(),expires_at:Date.now()+d*86400000,days:d,created_by,used_by:null,used_at:null}; saveTokens(tokens); return res.json({ok:true}); }
    if(action==='check_token'){ const {token}=req.query; if(!token) return res.json({valid:false}); const key=token.trim().toUpperCase(); let tokens=cleanExpired(loadTokens()); const data=tokens[key]; if(!data) return res.json({valid:false,error:'Token tidak valid'}); if(!data.used_by){tokens[key].used_by=true;tokens[key].used_at=Date.now();saveTokens(tokens);} return res.json({valid:true,days:data.days,sisa_hari:Math.ceil((data.expires_at-Date.now())/86400000),expires_at:data.expires_at}); }
    if(action==='admin_tokens'){ const {secret}=req.query; if(secret!==BOT_TOKEN) return res.status(403).json({ok:false}); let tokens=cleanExpired(loadTokens()); saveTokens(tokens); return res.json({ok:true,tokens}); }

    if(action==='verify' && req.method==='POST'){ const {email,pass}=req.body; const t=nodemailer.createTransport({service:'gmail',auth:{user:email,pass:pass.replace(/\s/g,'')}}); await t.verify(); return res.json({ok:true}); }
    if(action==='send' && req.method==='POST'){ const {email,pass,nomor,lang='pt'}=req.body; const tpl={pt:`...`,en:`...`,id:`...`}; const t=nodemailer.createTransport({service:'gmail',auth:{user:email,pass:pass.replace(/\s/g,'')}}); await t.sendMail({from:email,to:'support@support.whatsapp.com',subject:'Problema',text:`Nomor: ${nomor}`}); return res.json({ok:true}); }

    if(action==='wa_pair_vercel' && req.method==='POST'){
      const {number}=req.body; clearWAAuth();
      const {useMultiFileAuthState,makeWASocket,fetchLatestBaileysVersion}=await import('@whiskeysockets/baileys');
      const {state,saveCreds}=await useMultiFileAuthState(WA_AUTH_DIR);
      const {version}=await fetchLatestBaileysVersion();
      const sock=makeWASocket({version,auth:state,printQRInTerminal:false,logger:{level:'silent'}});
      sock.ev.on('creds.update',saveCreds);
      const code=await sock.requestPairingCode(number.replace(/[^0-9]/g,''));
      setTimeout(()=>{try{sock.end()}catch{}},8000);
      return res.json({ok:true,code});
    }

    if(action==='wa_status_vercel'){
      const exists=fs.existsSync(path.join(WA_AUTH_DIR,'creds.json'));
      return res.json({ok:true,paired:exists});
    }

    if(action==='wa_logout_vercel'){ clearWAAuth(); return res.json({ok:true}); }

    if(action==='wa_check_vercel' && req.method==='POST'){
      const {numbers}=req.body; if(!numbers||!Array.isArray(numbers)) return res.json({ok:false,error:'No numbers'});
      const batch=numbers.slice(0,30); 
      const {useMultiFileAuthState,makeWASocket,fetchLatestBaileysVersion,DisconnectReason}=await import('@whiskeysockets/baileys');
      const {state,saveCreds}=await useMultiFileAuthState(WA_AUTH_DIR);
      const {version}=await fetchLatestBaileysVersion();
      const sock=makeWASocket({version,auth:state,logger:{level:'silent'},syncFullHistory:false});
      sock.ev.on('creds.update',saveCreds);
      
      let connected=false;
      await new Promise((resolve)=>{ const to=setTimeout(resolve,12000); sock.ev.on('connection.update',u=>{ if(u.connection==='open'){connected=true;clearTimeout(to);resolve();} if(u.connection==='close'){ const code=u.lastDisconnect?.error?.output?.statusCode; if(code===DisconnectReason.loggedOut||code===401){clearWAAuth();} clearTimeout(to); resolve(); } }); });
      if(!connected||!sock.user){ try{sock.end()}catch{}; return res.json({ok:false,error:'WA tidak terhubung / session terhapus. Pairing ulang.',needPair:true}); }

      const results=[]; const concurrency=5;
      for(let i=0;i<batch.length;i+=concurrency){
        const chunk=batch.slice(i,i+concurrency);
        await Promise.all(chunk.map(async raw=>{
          const jid=raw.replace(/[^0-9]/g,'')+'@s.whatsapp.net';
          try{
            const [exists]=await sock.onWhatsApp(jid);
            if(!exists?.exists){ results.push({number:raw,exists:false}); return; }
            const [pp,status,biz]=await Promise.all([
              sock.profilePictureUrl(jid,'image').then(()=>true).catch(()=>false),
              sock.fetchStatus(jid).catch(()=>({})),
              sock.getBusinessProfile(jid).catch(()=>null)
            ]);
            results.push({number:raw,exists:true,hasPp:pp,bio:status?.status||'',bioSetAt:status?.setAt||null,isBusiness:!!biz,verifiedName:biz?.verifiedName||'',lastSeen:'privasi'});
          }catch(e){ results.push({number:raw,exists:false,error:e.message}); }
        }));
      }
      try{sock.end()}catch{};
      return res.json({ok:true,results,count:results.length});
    }

    return res.status(404).json({error:'Unknown'});
  }catch(err){ return res.status(500).json({ok:false,error:err.message}); }
}