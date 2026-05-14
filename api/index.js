export const config = { maxDuration: 60 };
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = '/tmp/fw_tokens.json';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const OWNER_ID = process.env.OWNER_TELEGRAM_ID || '';

const load = () => { try { return JSON.parse(fs.readFileSync(TOKEN_FILE,'utf8')); } catch { return {}; } };
const save = (d) => { try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(d)); } catch {} };
const clean = (t) => { const n=Date.now(); Object.keys(t).forEach(k=>{if(t[k].expires_at<n)delete t[k]}); return t; };
const gen = () => { const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<8;i++) s+=c[Math.floor(Math.random()*c.length)]; return s; };
const send = async (id,txt) => { if(!BOT_TOKEN) return false; try { const r=await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:id,text:txt,parse_mode:'Markdown'})}); return r.ok; } catch { return false; } };

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='OPTIONS') return res.status(200).end();
  const {action}=req.query;
  try{
    if(action==='telegram' && req.method==='POST'){
      const m=req.body.message; if(!m?.text) return res.json({ok:true});
      const cid=m.chat.id; const uid=String(m.from.id); const t=m.text.trim();
      if(t==='/start'){ await send(cid,'*FIXMERAH WALZ BOT*\n\nKetik /token 7'); return res.json({ok:true}); }
      if(t.startsWith('/token')){
        if(OWNER_ID && uid!==OWNER_ID){ await send(cid,'Hanya owner'); return res.json({ok:true}); }
        let d=parseInt(t.split(' ')[1]||'7'); if(isNaN(d)||d<1||d>30) d=7;
        const token=gen(); const exp=Date.now()+d*86400000;
        const tokens=clean(load()); tokens[token]={expires_at:exp,days:d}; save(tokens);
        const msg=`✅ TOKEN: \`${token}\`\nDurasi: ${d} hari\nExpired: ${new Date(exp).toLocaleDateString('id-ID')}`;
        await send(cid,msg); return res.json({ok:true});
      }
      return res.json({ok:true});
    }
    if(action==='init_bot'){ if(req.query.secret!==BOT_TOKEN) return res.status(403).json({error:'forbidden'}); const url=`https://${req.headers.host}/api?action=telegram`; const r=await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(url)}`); return res.json(await r.json()); }
    if(action==='check_token'){ const k=(req.query.token||'').toUpperCase(); const t=clean(load()); const d=t[k]; if(!d) return res.json({valid:false}); return res.json({valid:true,expires_at:d.expires_at,sisa_hari:Math.ceil((d.expires_at-Date.now())/86400000)}); }
    if(action==='admin_tokens'){ if(req.query.secret!==BOT_TOKEN) return res.status(403).end(); return res.json(clean(load())); }
    return res.json({ok:true,msg:'API aktif'});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
