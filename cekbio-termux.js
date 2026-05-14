#!/usr/bin/env node
import fs from 'fs';
import readline from 'readline';
import pkg from '@whiskeysockets/baileys';
import pino from 'pino';
const {default:makeWASocket,useMultiFileAuthState,fetchLatestBaileysVersion}=pkg;
const API_URL='https://fixmerah.vercel.app/api';
const AUTH_DIR='./session-wa';
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const ask=q=>new Promise(r=>rl.question(q,r));
const c={r:'[31m',g:'[32m',y:'[33m',cya:'[36m',w:'[37m',reset:'[0m',bold:'[1m'};
function header(t){console.clear();console.log(c.r+'╔══════════════════════════════════════╗');console.log('║'+c.bold+c.w+'     FIXMERAH WALZ - TERMUX        '+c.reset+c.r+'║');console.log('╚══════════════════════════════════════╝'+c.reset);console.log(c.cya+'> '+t+c.reset+'
')}
async function checkToken(token){try{const r=await fetch(`${API_URL}?action=check_token&token=${token.trim().toUpperCase()}`);return await r.json()}catch(e){return{valid:false,error:e.message}}}
async function pairingWA(){header('PAIRING WHATSAPP');const number=await ask(c.y+'Masukkan nomor WA (628xxx): '+c.reset);if(!number)return;const{state,saveCreds}=await useMultiFileAuthState(AUTH_DIR);const{version}=await fetchLatestBaileysVersion();const sock=makeWASocket({version,auth:state,logger:pino({level:'silent'}),printQRInTerminal:false,browser:['Fixmerah-Termux','Chrome','1.0']});sock.ev.on('creds.update',saveCreds);try{const code=await sock.requestPairingCode(number.replace(/[^0-9]/g,''));console.log('
'+c.g+'KODE PAIRING:'+c.reset);console.log(c.bold+'  '+code.match(/.{1,4}/g).join(' ')+c.reset);console.log(c.y+'
Buka WA > Perangkat Tertaut'+c.reset);await new Promise(r=>{sock.ev.on('connection.update',u=>{if(u.connection==='open'){console.log(c.g+'
Terhubung!'+c.reset);r()}if(u.connection==='close')r()});setTimeout(r,60000)})}catch(e){console.log(c.r+'Gagal: '+e.message+c.reset)}finally{try{sock.end()}catch{};await ask('
Enter...')}}
async function cekBio(){header('CEK BIO WHATSAPP');const{state,saveCreds}=await useMultiFileAuthState(AUTH_DIR);const{version}=await fetchLatestBaileysVersion();const sock=makeWASocket({version,auth:state,logger:pino({level:'silent'})});sock.ev.on('creds.update',saveCreds);const connected=await new Promise(r=>{const t=setTimeout(()=>r(false),10000);sock.ev.on('connection.update',u=>{if(u.connection==='open'){clearTimeout(t);r(true)}if(u.connection==='close'){clearTimeout(t);r(false)}})});if(!connected||!sock.user){console.log(c.r+'WA belum terhubung'+c.reset);try{sock.end()}catch{};await ask('
Enter...');return}console.log(c.g+'Terhubung: '+sock.user.id.split(':')[0]+c.reset+'
');const input=await ask(c.y+'Nomor (pisah koma):
'+c.reset);const numbers=input.split(/[,\s]+/).filter(Boolean);if(!numbers.length){try{sock.end()}catch{};return}console.log(c.cya+`
Memproses ${numbers.length} nomor...
`+c.reset);const results=[];for(let i=0;i<numbers.length;i++){const raw=numbers[i];const jid=raw.replace(/[^0-9]/g,'')+'@s.whatsapp.net';process.stdout.write(`[${i+1}/${numbers.length}] ${raw} ... `);try{const[ex]=await sock.onWhatsApp(jid);if(!ex?.exists){console.log(c.r+'TIDAK'+c.reset);results.push({number:raw,exists:false});continue}const[pp,status,biz]=await Promise.all([sock.profilePictureUrl(jid,'image').then(()=>true).catch(()=>false),sock.fetchStatus(jid).catch(()=>({})),sock.getBusinessProfile(jid).catch(()=>null)]);console.log(c.g+'ADA'+c.reset);results.push({number:raw,exists:true,isBusiness:!!biz,verified:biz?.verifiedName||'',hasPp:pp,bio:status?.status||'',bioDate:status?.setAt?new Date(status.setAt*1000).getFullYear():'-'})}catch{console.log(c.r+'ERROR'+c.reset);results.push({number:raw,exists:false})}}try{sock.end()}catch{};const txt=results.map((r,i)=>`${i+1}. ${r.number}
   WA: ${r.exists?'YA':'TIDAK'}${r.exists?`
   Tipe: ${r.isBusiness?'Bisnis':'Pribadi'}${r.verified?' ('+r.verified+')':''}
   Foto: ${r.hasPp?'Ada':'Tidak'}
   Bio: ${r.bio||'-'}
   Tahun: ${r.bioDate}`:''}`).join('

');fs.writeFileSync(`hasil-${Date.now()}.txt`,txt);header('HASIL');results.forEach(r=>{const s=r.exists?c.g+'ADA':c.r+'TIDAK';console.log(`${r.number} : ${s}${c.reset}`);if(r.exists)console.log(`  ${c.cya}Bio:${c.reset} ${r.bio||'-'}`)});console.log(c.y+'
Disimpan ke file'+c.reset);await ask('
Enter...')}
async function main(){console.clear();console.log(c.r+'FIXMERAH WALZ'+c.reset);const token=await ask(c.y+'Token: '+c.reset);header('VALIDASI');const cek=await checkToken(token);if(!cek.valid){console.log(c.r+'Token tidak valid'+c.reset);rl.close();return}console.log(c.g+'TOKEN VALID'+c.reset);console.log(`Sisa: ${Math.ceil((cek.expires_at-Date.now())/86400000)} hari`);await ask('
Enter...');while(true){header('MENU');console.log('1. Pairing WA
2. Cek Bio
3. Keluar');const p=await ask(c.y+'Pilih: '+c.reset);if(p==='1')await pairingWA();else if(p==='2')await cekBio();else break}rl.close()}
main();
