#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const WEBSITE_URL = 'https://fixmerah.vercel.app';
const API_URL = WEBSITE_URL + '/api';
const AUTH_DIR = './session-wa';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));
const c = { r:'\x1b[31m', g:'\x1b[32m', y:'\x1b[33m', b:'\x1b[34m', m:'\x1b[35m', cya:'\x1b[36m', w:'\x1b[37m', reset:'\x1b[0m', bold:'\x1b[1m' };
function clear(){ console.clear(); }
function header(title){ clear(); console.log(c.r+'╔══════════════════════════════════════╗'); console.log('║'+c.bold+c.w+'     FIXMERAH WALZ - TERMUX        '+c.reset+c.r+'║'); console.log('╚══════════════════════════════════════╝'+c.reset); console.log(c.cya+'» '+title+c.reset+'\n'); }
async function checkToken(token){ try{ const res=await fetch(`${API_URL}?action=check_token&token=${token.trim().toUpperCase()}`); return await res.json(); }catch(e){ return {valid:false,error:e.message}; } }
async function pairingWA(){
header('PAIRING WHATSAPP');
const number=await ask(c.y+'Masukkan nomor WA (628xxx): '+c.reset);
if(!number)return;
const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
const { version } = await fetchLatestBaileysVersion();
const sock = makeWASocket({ version, auth: state, logger: pino({level:'silent'}), printQRInTerminal:false, browser:['Fixmerah-Termux','Chrome','1.0'] });
sock.ev.on('creds.update', saveCreds);
try{
const code = await sock.requestPairingCode(number.replace(/[^0-9]/g,''));
console.log('\n'+c.g+'✅ KODE PAIRING:'+c.reset);
console.log(c.bold+c.w+'╔═══════════════╗');
console.log('║  '+code.match(/.{1,4}/g).join(' ')+'  ║');
console.log('╚═══════════════╝'+c.reset);
console.log(c.y+'\nBuka WA > Perangkat Tertaut > Tautkan dengan nomor'+c.reset);
await new Promise((resolve)=>{ sock.ev.on('connection.update', (u)=>{ if(u.connection==='open'){ console.log(c.g+'\n✓ Terhubung!'+c.reset); resolve(); } if(u.connection==='close')resolve(); }); setTimeout(resolve,60000); });
}catch(e){ console.log(c.r+'Gagal: '+e.message+c.reset); } finally { try{sock.end()}catch{} await ask('\nTekan Enter...'); }
}
async function cekBio(){
header('CEK BIO WHATSAPP');
const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
const { version } = await fetchLatestBaileysVersion();
const sock = makeWASocket({ version, auth: state, logger: pino({level:'silent'}) });
sock.ev.on('creds.update', saveCreds);
const connected = await new Promise(res=>{ const to=setTimeout(()=>res(false),10000); sock.ev.on('connection.update', u=>{ if(u.connection==='open'){ clearTimeout(to); res(true); } if(u.connection==='close'){ clearTimeout(to); res(false); } }); });
if(!connected||!sock.user){ console.log(c.r+'❌ WA belum terhubung. Pairing dulu.'+c.reset); try{sock.end()}catch{} await ask('\nEnter...'); return; }
console.log(c.g+'✓ Terhubung sebagai: '+sock.user.id.split(':')[0]+c.reset+'\n');
const input = await ask(c.y+'Masukkan nomor (pisah koma/spasi):\n'+c.reset);
let numbers = input.split(/[,\s\n]+/).filter(Boolean);
if(numbers.length===0){ console.log('Tidak ada nomor'); try{sock.end()}catch{} return; }
console.log(c.cya+`\nMemproses ${numbers.length} nomor...\n`+c.reset);
const results = [];
for(let i=0;i<numbers.length;i++){
const raw=numbers[i]; const jid=raw.replace(/[^0-9]/g,'')+'@s.whatsapp.net';
process.stdout.write(`[${i+1}/${numbers.length}] ${raw} ... `);
try{
const [ex]=await sock.onWhatsApp(jid);
if(!ex?.exists){ console.log(c.r+'TIDAK ADA'+c.reset); results.push({number:raw,exists:false}); continue; }
const [pp,status,biz]=await Promise.all([ sock.profilePictureUrl(jid,'image').then(()=>true).catch(()=>false), sock.fetchStatus(jid).catch(()=>({})), sock.getBusinessProfile(jid).catch(()=>null) ]);
console.log(c.g+'ADA'+c.reset);
results.push({ number:raw, exists:true, isBusiness:!!biz, verified:biz?.verifiedName||'', hasPp:pp, bio:status?.status||'', bioDate:status?.setAt?new Date(status.setAt*1000).getFullYear():'-' });
}catch(e){ console.log(c.r+'ERROR'+c.reset); results.push({number:raw,exists:false}); }
}
try{sock.end()}catch{}
const txt = results.map((r,i)=>`${i+1}. ${r.number}\n   - WA: ${r.exists?'YA':'TIDAK'}${r.exists?`\n   - Tipe: ${r.isBusiness?'Bisnis':'Pribadi'}${r.verified?' ('+r.verified+')':''}\n   - Foto: ${r.hasPp?'Ada':'Tidak'}\n   - Bio: ${r.bio||'-'}\n   - Bio Tahun: ${r.bioDate}`:''}`).join('\n\n');
fs.writeFileSync(`hasil-cek-${Date.now()}.txt`, txt);
header('HASIL CEK BIO');
results.forEach(r=>{ const status=r.exists?c.g+'✓ ADA':c.r+'✗ TIDAK'; console.log(`${c.w}${r.number}${c.reset} : ${status}${c.reset}`); if(r.exists){ console.log(`  ${c.cya}├─ Tipe :${c.reset} ${r.isBusiness?'Bisnis':'Pribadi'} ${r.verified?`(${r.verified})`:''}`); console.log(`  ${c.cya}├─ Foto :${c.reset} ${r.hasPp?'Ada':'Tidak'}`); console.log(`  ${c.cya}└─ Bio  :${c.reset} ${r.bio||'-'} (${r.bioDate})`); } });
console.log(c.y+'\n✓ Hasil disimpan ke file .txt'+c.reset); await ask('\nEnter...');
}
async function main(){
clear();
console.log(c.r+`
  ███████╗██╗██╗  ██╗███╗   ███╗███████╗██████╗  █████╗ ██╗  ██╗
  ██╔════╝██║╚██╗██╔╝████╗ ████║██╔════╝██╔══██╗██╔══██╗██║  ██║
  █████╗  ██║ ╚███╔╝ ██╔████╔██║█████╗  ██████╔╝███████║███████║
  ██╔══╝  ██║ ██╔██╗ ██║╚██╔╝██║██╔══╝  ██╔══██╗██╔══██║██╔══██║
  ██║     ██║██╔╝ ██╗██║ ╚═╝ ██║███████╗██║  ██║██║  ██║██║  ██║
  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
`+c.reset);
console.log(c.bold+'           WALZ - TERMUX EDITION\n'+c.reset);
const token = await ask(c.y+'🔑 Masukkan TOKEN: '+c.reset);
header('VALIDASI TOKEN');
console.log('Menghubungkan ke website...');
const cek = await checkToken(token);
if(!cek.valid){ console.log(c.r+'❌ Token tidak valid atau expired!'+c.reset); console.log(c.w+'Error: '+(cek.error||'Token salah')+c.reset); rl.close(); return; }
console.log(c.g+'✅ TOKEN VALID'+c.reset);
console.log(c.cya+'╭─────────────────────────╮');
console.log(`│ Sisa Hari : ${Math.ceil((cek.expires_at-Date.now())/86400000)} hari`);
console.log(`│ Expired   : ${new Date(cek.expires_at).toLocaleDateString('id-ID')}`);
console.log('╰─────────────────────────╯'+c.reset);
await ask('\nTekan Enter untuk masuk menu...');
while(true){
header('MENU UTAMA');
console.log(c.w+'1.'+c.reset+' Pairing WhatsApp');
console.log(c.w+'2.'+c.reset+' Cek Bio Nomor');
console.log(c.w+'3.'+c.reset+' Cek Status Token');
console.log(c.w+'4.'+c.reset+' Keluar\n');
const pil = await ask(c.y+'Pilih [1-4]: '+c.reset);
if(pil==='1')await pairingWA();
else if(pil==='2')await cekBio();
else if(pil==='3'){ header('STATUS TOKEN'); const s=await checkToken(token); console.log(s.valid?c.g+'AKTIF':c.r+'EXPIRED'); console.log('Sisa: '+Math.ceil((s.expires_at-Date.now())/86400000)+' hari'); await ask('\nEnter...'); }
else if(pil==='4'){ console.log(c.g+'Sampai jumpa!'+c.reset); break; }
}
rl.close();
}
main();
