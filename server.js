// AK MUSIC & VIDEO DOWNLOADER - local backend (Node.js built-ins only)
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const dns = require('node:dns').promises;
const net = require('node:net');
const { URL } = require('node:url');
const { spawn } = require('node:child_process');
// Prefer packaged, platform-matched FFmpeg binaries; fall back to system PATH.
function resolveMediaBinary(moduleName, fallbackName) {
  try {
    const mod = require(moduleName);
    const candidate = typeof mod === 'string' ? mod : mod?.path;
    if (candidate && fs.existsSync(candidate)) return candidate;
  } catch {}
  return fallbackName;
}
const FFMPEG_BIN = resolveMediaBinary('ffmpeg-static', 'ffmpeg');
const FFPROBE_BIN = resolveMediaBinary('ffprobe-static', 'ffprobe');
const { DatabaseSync } = require('node:sqlite');
const APP_VERSION = require('./package.json').version;

const ROOT = __dirname;
const PUBLIC = process.env.AK_PUBLIC_DIR ? path.resolve(process.env.AK_PUBLIC_DIR) : path.join(ROOT, 'public');
const DATA = process.env.AK_DATA_DIR ? path.resolve(process.env.AK_DATA_DIR) : path.join(ROOT, 'data');
const DOWNLOADS = path.join(DATA, 'downloads');
const MAX_UPLOAD = 500 * 1024 * 1024;
const PORT = Number(process.env.PORT || 8787);
for (const d of [DATA, DOWNLOADS]) fs.mkdirSync(d, {recursive:true});
const db = new DatabaseSync(path.join(DATA,'ak_library.sqlite'));
db.exec(`
 CREATE TABLE IF NOT EXISTS media_files(
  id INTEGER PRIMARY KEY, filename TEXT NOT NULL UNIQUE, size INTEGER NOT NULL,
  modified TEXT NOT NULL, format TEXT NOT NULL, favorite INTEGER NOT NULL DEFAULT 0
 );
 CREATE TABLE IF NOT EXISTS playlists(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, created TEXT NOT NULL
 );
 CREATE TABLE IF NOT EXISTS playlist_items(
  playlist_id INTEGER NOT NULL, filename TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE(playlist_id,filename),
  FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
 );
`);
// Upgrade existing databases without losing saved playlists.
const playlistItemColumns = db.prepare('PRAGMA table_info(playlist_items)').all().map(c=>c.name);
if(!playlistItemColumns.includes('position')) db.exec('ALTER TABLE playlist_items ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
for(const pl of db.prepare('SELECT id FROM playlists').all()){
 const items=db.prepare('SELECT rowid,position FROM playlist_items WHERE playlist_id=? ORDER BY rowid').all(pl.id);
 let pos=0;for(const item of items)db.prepare('UPDATE playlist_items SET position=? WHERE rowid=?').run(pos++,item.rowid);
}

const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.flac':'audio/flac','.ogg':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.mp4':'video/mp4','.m4v':'video/mp4','.mov':'video/quicktime','.webm':'video/webm'};
function send(res, code, obj) { res.writeHead(code, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'}); res.end(JSON.stringify(obj)); }
function safeName(s) { return String(s||'media').normalize('NFKC').replace(/[^\p{L}\p{N}._ -]/gu,'_').replace(/^\.+/,'').slice(0,120) || 'media'; }
function inside(p, dir) { return p.startsWith(dir + path.sep); }
function readBody(req, limit=1024*1024) { return new Promise((resolve,reject)=>{let chunks=[],n=0;req.on('data',c=>{n+=c.length;if(n>limit){reject(new Error('Request too large'));req.destroy();}else chunks.push(c)});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject);}); }
function privateIPv4(ip){
 const a=ip.split('.').map(Number);
 return a[0]===0||a[0]===10||a[0]===127||a[0]>=224||
  (a[0]===100&&a[1]>=64&&a[1]<=127)||
  (a[0]===169&&a[1]===254)||(a[0]===172&&a[1]>=16&&a[1]<=31)||
  (a[0]===192&&a[1]===168)||(a[0]===192&&a[1]===0&&a[2]===0)||
  (a[0]===198&&(a[1]===18||a[1]===19))||
  (a[0]===198&&a[1]===51&&a[2]===100)||
  (a[0]===203&&a[1]===0&&a[2]===113)||
  (a[0]===255&&a[1]===255&&a[2]===255&&a[3]===255);
}
function privateIPv6(ip){
 const x=ip.toLowerCase().split('%')[0];
 if(x==='::'||x==='::1'||x.startsWith('fc')||x.startsWith('fd')||
    /^fe[89ab]/.test(x)||x.startsWith('ff')||x.startsWith('2001:db8:')) return true;
 // Only globally-routable 2000::/3 addresses are accepted.
 if(!/^2[0-9a-f]{3}:/.test(x)) return true;
 // IPv4-mapped IPv6 is not accepted, even if it embeds a public IPv4.
 if(x.includes('::ffff:')) return true;
 return false;
}
function blockedAddress(ip){
 const v=net.isIP(ip);
 return v===4?privateIPv4(ip):v===6?privateIPv6(ip):true;
}
async function resolvePublicHttps(raw){
 const u=new URL(raw);
 if(u.protocol!=='https:'||u.username||u.password) throw Error('HTTPS public URL only');
 const host=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
 if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')) throw Error('Private/local addresses are blocked');
 const literal=net.isIP(host);
 let addresses;
 if(literal) addresses=[{address:host,family:literal}];
 else addresses=await dns.lookup(host,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(x=>blockedAddress(x.address))) throw Error('Private, local or non-public destination is blocked');
 return {url:u,address:addresses[0]};
}
async function downloadUrl(raw, dest, redirects=0){
 if(redirects>4) throw Error('Too many redirects');
 const {url:u,address} = await resolvePublicHttps(raw);
 return new Promise((resolve,reject)=>{
  const req=https.get(u,{lookup:(hostname,opts,cb)=>cb(null,address.address,address.family),
   headers:{'user-agent':'AKDownloader/1.1','accept':'*/*'},timeout:30000},res=>{
   if([301,302,303,307,308].includes(res.statusCode)){
    res.resume();
    if(!res.headers.location)return reject(Error('Redirect without location'));
    return downloadUrl(new URL(res.headers.location,u).href,dest,redirects+1).then(resolve,reject);
   }
   if(res.statusCode<200||res.statusCode>=300){res.resume();return reject(Error('Source returned HTTP '+res.statusCode));}
   const len=Number(res.headers['content-length']||0);
   if(len>MAX_UPLOAD){res.resume();return reject(Error('File exceeds 500 MB limit'));}
   let count=0;const out=fs.createWriteStream(dest,{flags:'wx'});
   res.on('data',c=>{count+=c.length;if(count>MAX_UPLOAD){req.destroy(Error('File exceeds 500 MB limit'));out.destroy();fs.rmSync(dest,{force:true});}});
   res.pipe(out);
   out.on('finish',()=>resolve({bytes:count,type:res.headers['content-type']||''}));
   out.on('error',e=>{fs.rmSync(dest,{force:true});reject(e);});
  });
  req.on('timeout',()=>req.destroy(Error('Download timed out')));
  req.on('error',e=>{fs.rmSync(dest,{force:true});reject(e);});
 });
}

// Persistent download queue. Jobs survive restarts; interrupted jobs become paused.
const JOBS_FILE = path.join(DATA, 'jobs.json');
let jobs = [];
let activeJobId = null;
let workerRunning = false;
try { jobs = JSON.parse(fs.readFileSync(JOBS_FILE,'utf8')); if(!Array.isArray(jobs)) jobs=[]; }
catch { jobs=[]; }
for (const j of jobs) {
 if (j.status === 'downloading') j.status = 'paused';
 j.error = j.status === 'paused' ? 'சேவையகம் மீண்டும் தொடங்கியது; தொடர Resume அழுத்தவும்' : j.error;
}
function persistJobs(){ fs.writeFileSync(JOBS_FILE,JSON.stringify(jobs,null,2)); }
function publicJob(j){
 const {id,name,status,bytes,total,speed,error,createdAt,updatedAt,resumable}=j;
 return {id,name,status,bytes,total,speed,error,createdAt,updatedAt,resumable};
}
function jobById(id){ return jobs.find(j=>j.id===id); }
function queueJob(url,name){
 const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 const j={id,url,name,status:'queued',bytes:0,total:0,speed:0,error:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),resumable:false};
 jobs.unshift(j); persistJobs(); runQueue(); return j;
}
function stopJob(j, status, error=''){
 j.stopReason=status; j.status=status; j.error=error; j.updatedAt=new Date().toISOString(); persistJobs();
 if(j.abortRequest) j.abortRequest();
}
async function runQueue(){
 if(workerRunning)return;
 workerRunning=true;
 try{
  while(true){
   const j=jobs.find(x=>x.status==='queued');
   if(!j)break;
   activeJobId=j.id; j.status='downloading';j.error='';j.updatedAt=new Date().toISOString();persistJobs();
   const dest=path.join(DOWNLOADS,j.id+'_'+j.name);
   try{
    await downloadJob(j,dest);
    if(j.status==='downloading'){j.status='completed';j.error='';j.updatedAt=new Date().toISOString();persistJobs();}
   }catch(e){
    if(j.status==='downloading'){j.status='failed';j.error=e.message||'Download failed';j.updatedAt=new Date().toISOString();persistJobs();}
   }
   activeJobId=null;
  }
 }finally{workerRunning=false;activeJobId=null; if(jobs.some(x=>x.status==='queued'))setImmediate(runQueue);}
}
async function downloadJob(j,dest){
 // Resume only when the source supplied a validator on the previous response.
 // If the validator is missing, restart from byte zero rather than risk appending
 // bytes from a changed file.
 let offset=fs.existsSync(dest)?fs.statSync(dest).size:0;
 if(offset>0 && (!j.resumable || (!j.etag && !j.lastModified))){
  fs.rmSync(dest,{force:true});offset=0;j.bytes=0;j.total=0;j.resumable=false;
 }
 const attempt=await resolvePublicHttps(j.url);
 await new Promise((resolve,reject)=>{
  let settled=false,received=0,lastBytes=offset,lastAt=Date.now();
  const finish=(err)=>{if(settled)return;settled=true;j.abortRequest=null;if(err)reject(err);else resolve();};
  const headers={'user-agent':'AKDownloader/1.2','accept':'*/*'};
  if(offset>0){
   headers.range='bytes='+offset+'-';
   if(j.etag)headers['if-range']=j.etag;else if(j.lastModified)headers['if-range']=j.lastModified;
  }
  const req=https.get(attempt.url,{lookup:(hostname,opts,cb)=>cb(null,attempt.address.address,attempt.address.family),headers,timeout:30000},res=>{
   if([301,302,303,307,308].includes(res.statusCode)){
    res.resume();
    if(!res.headers.location)return finish(Error('Redirect without location'));
    j.url=new URL(res.headers.location,attempt.url).href;
    return finish(Error('முகவரி மாறியுள்ளது; பாதுகாப்பு சரிபார்ப்புக்குப் பிறகு மீண்டும் Resume செய்யவும்'));
   }
   let append=offset>0;
   if(append && res.statusCode===200){
    // If-Range validator changed (or server ignored Range): safely restart.
    append=false;offset=0;j.bytes=0;j.total=0;j.resumable=false;
   }else if(append && res.statusCode===206){
    const m=/^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i.exec(String(res.headers['content-range']||''));
    if(!m || Number(m[1])!==offset || Number(m[2])<Number(m[1])){
     res.resume();fs.rmSync(dest,{force:true});j.bytes=0;j.total=0;j.resumable=false;return finish(Error('Resume தரவு சரிபார்ப்பு தோல்வி; மீண்டும் தொடங்கவும்'));
    }
   }else if(append){res.resume();return finish(Error('Source returned HTTP '+res.statusCode));}
   else if(res.statusCode!==200){res.resume();return finish(Error('Source returned HTTP '+res.statusCode));}
   const range=String(res.headers['content-range']||'');
   let total=Number(res.headers['content-length']||0)+(append?offset:0);
   if(append){const m=/^bytes\s+\d+-\d+\/(\d+)$/i.exec(range);if(m)total=Number(m[1]);}
   if(total>MAX_UPLOAD){res.resume();return finish(Error('File exceeds 500 MB limit'));}
   j.total=total;
   j.etag=res.headers.etag|| (append?j.etag:'');
   j.lastModified=res.headers['last-modified']|| (append?j.lastModified:'');
   j.resumable=!!(res.headers['accept-ranges']==='bytes'||res.statusCode===206) && !!(j.etag||j.lastModified);
   j.updatedAt=new Date().toISOString();persistJobs();
   const expectedResponseBytes=Number(res.headers['content-length']||0);
   const out=fs.createWriteStream(dest,{flags:append?'a':'w'});
   let responseFailed=false;
   const failResponse=(message)=>{
    if(responseFailed)return;
    responseFailed=true;
    // Wait until the write stream closes before reading the partial file size.
    // This prevents in-memory progress from exceeding bytes safely written to disk.
    out.once('close',()=>{
     try{j.bytes=fs.existsSync(dest)?fs.statSync(dest).size:0;}catch{j.bytes=0;}
     j.speed=0;j.updatedAt=new Date().toISOString();persistJobs();
     finish(Error(message));
    });
    out.destroy();
   };
   res.on('data',chunk=>{
    received+=chunk.length;j.bytes=offset+received;
    const now=Date.now();if(now-lastAt>=1000){j.speed=Math.round((j.bytes-lastBytes)*1000/(now-lastAt));lastBytes=j.bytes;lastAt=now;j.updatedAt=new Date().toISOString();persistJobs();}
    if(j.bytes>MAX_UPLOAD){req.destroy(Error('File exceeds 500 MB limit'));out.destroy();fs.rmSync(dest,{force:true});}
   });
   res.on('aborted',()=>failResponse('இணைய இணைப்பு துண்டிக்கப்பட்டது; மீண்டும் Resume செய்யவும்'));
   res.on('error',e=>failResponse(e.message||'Download response failed'));
   res.pipe(out);
   out.on('finish',()=>{
    if(responseFailed)return;
    if(!res.complete)return failResponse('முழுமையற்ற பதிவிறக்கம்; மீண்டும் Resume செய்யவும்');
    if(expectedResponseBytes&&received!==expectedResponseBytes)return failResponse('பதிவிறக்கப்பட்ட கோப்பு அளவு சரிபார்ப்பு தோல்வி; மீண்டும் Resume செய்யவும்');
    j.bytes=offset+received;j.speed=0;j.updatedAt=new Date().toISOString();persistJobs();finish();
   });
   out.on('error',e=>failResponse(e.message||'கோப்பைச் சேமிக்க முடியவில்லை'));
  });
  j.abortRequest=()=>{req.destroy(Error('Job stopped'));};
  req.on('timeout',()=>req.destroy(Error('Download timed out')));
  req.on('error',e=>{
   if(j.stopReason==='paused'||j.stopReason==='cancelled'){finish();return;}
   finish(e);
  });
 });
}

function setJobAction(id,action){
 const j=jobById(id);if(!j)throw Error('வேலை கிடைக்கவில்லை');
 if(action==='pause'){
  if(j.status!=='downloading'&&j.status!=='queued')throw Error('இந்த வேலையை Pause செய்ய முடியாது');
  if(j.status==='queued'){j.status='paused';j.updatedAt=new Date().toISOString();persistJobs();}
  else stopJob(j,'paused','பயனர் Pause செய்தார்');
 }else if(action==='resume'){
  if(!['paused','failed'].includes(j.status))throw Error('இந்த வேலையை Resume செய்ய முடியாது');
  j.status='queued';j.error='';j.stopReason='';j.updatedAt=new Date().toISOString();persistJobs();runQueue();
 }else if(action==='cancel'){
  if(['completed','cancelled'].includes(j.status))throw Error('இந்த வேலையை Cancel செய்ய முடியாது');
  stopJob(j,'cancelled','பயனர் Cancel செய்தார்');
 }else if(action==='retry'){
  if(!['failed','cancelled'].includes(j.status))throw Error('இந்த வேலையை Retry செய்ய முடியாது');
  j.status='queued';j.error='';j.stopReason='';j.updatedAt=new Date().toISOString();persistJobs();runQueue();
 }else throw Error('தவறான செயல்');
 return publicJob(j);
}

function syncLibrary(){
 const disk=new Set();
 for(const filename of fs.readdirSync(DOWNLOADS)){
  const full=path.join(DOWNLOADS,filename);let st;
  try{st=fs.statSync(full);if(!st.isFile())continue;}catch{continue;}
  disk.add(filename);
  db.prepare(`INSERT INTO media_files(filename,size,modified,format) VALUES(?,?,?,?)
   ON CONFLICT(filename) DO UPDATE SET size=excluded.size,modified=excluded.modified,format=excluded.format`)
   .run(filename,st.size,st.mtime.toISOString(),path.extname(filename).slice(1).toLowerCase()||'unknown');
 }
 const rows=db.prepare('SELECT filename FROM media_files').all();
 const del=db.prepare('DELETE FROM media_files WHERE filename=?');
 for(const row of rows)if(!disk.has(row.filename))del.run(row.filename);
}
function libraryRows(q='',fav=false){
 syncLibrary();
 const term='%'+String(q||'').slice(0,100)+'%';
 return db.prepare(`SELECT id,filename,size,modified,format,favorite FROM media_files
  WHERE filename LIKE ? AND (?=0 OR favorite=1) ORDER BY modified DESC`).all(term,fav?1:0);
}
function backupData(){
 syncLibrary();
 return {app:'AK MUSIC & VIDEO DOWNLOADER',version:APP_VERSION,createdAt:new Date().toISOString(),
  library:db.prepare('SELECT filename,size,modified,format,favorite FROM media_files').all(),
  playlists:db.prepare('SELECT id,name,created FROM playlists').all(),
  playlistItems:db.prepare('SELECT playlist_id,filename,position FROM playlist_items ORDER BY playlist_id,position').all(),
  jobs:jobs.map(({abortRequest,...j})=>j)};
}
function runFfmpeg(args){return new Promise((resolve,reject)=>{const p=spawn(FFMPEG_BIN,['-hide_banner','-y',...args],{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d.toString());p.on('error',reject);p.on('close',c=>c===0?resolve():reject(Error(err.slice(-1800)||'FFmpeg failed')));});}
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(origin && origin!=='http://127.0.0.1:'+PORT && origin!=='http://localhost:'+PORT){res.writeHead(403);return res.end('Forbidden origin');}
 res.setHeader('x-content-type-options','nosniff');
 res.setHeader('x-frame-options','DENY');
 res.setHeader('referrer-policy','no-referrer');
 res.setHeader('permissions-policy','camera=(), microphone=(), geolocation=()');
 const u=new URL(req.url,'http://localhost');
 try{
  if(req.method==='GET'&&u.pathname==='/api/storage'){
   const disk=fs.statfsSync(DATA);
   const total=disk.blocks*disk.bsize;
   const free=disk.bavail*disk.bsize;
   const library=db.prepare('SELECT COUNT(*) AS count,COALESCE(SUM(size),0) AS bytes FROM media_files').get();
   const downloadBytes=fs.readdirSync(DOWNLOADS,{withFileTypes:true}).filter(x=>x.isFile()).reduce((sum,x)=>{try{return sum+fs.statSync(path.join(DOWNLOADS,x.name)).size;}catch{return sum;}},0);
   return send(res,200,{totalBytes:total,freeBytes:free,usedBytes:Math.max(0,total-free),libraryCount:library.count,libraryBytes:library.bytes,downloadBytes});
  }
  if(req.method==='GET'&&u.pathname==='/api/health'){
   const checkBinary=(bin)=>new Promise(resolve=>{const p=spawn(bin,['-version'],{windowsHide:true,stdio:'ignore'});p.on('error',()=>resolve(false));p.on('close',code=>resolve(code===0));});
   const [ffmpeg,ffprobe]=await Promise.all([checkBinary(FFMPEG_BIN),checkBinary(FFPROBE_BIN)]);
   return send(res,200,{ok:true,ffmpeg,ffprobe,version:APP_VERSION});
  }
  if(req.method==='GET'&&u.pathname==='/api/search'){
   const q=(u.searchParams.get('q')||'').trim();if(!q)return send(res,400,{error:'தேடல் சொல்லை உள்ளிடவும்'});
   const api='https://archive.org/advancedsearch.php?q='+encodeURIComponent('('+q.replace(/[^\p{L}\p{N} ]/gu,' ') +') AND mediatype:(audio OR movies)')+'&fl[]=identifier,title,creator,year,mediatype&rows=20&page=1&output=json';
   const r=await fetch(api);if(!r.ok)throw Error('Catalog search failed');const j=await r.json();return send(res,200,{results:j.response?.docs||[],source:'Internet Archive'});
  }
  if(req.method==='GET'&&u.pathname==='/api/jobs'){
   return send(res,200,{jobs:jobs.map(publicJob)});
  }
  if(req.method==='GET'&&u.pathname==='/api/jobs/export'){
   const rows=jobs.map(publicJob);
   const format=(u.searchParams.get('format')||'json').toLowerCase();
   if(format==='csv'){
    const columns=['id','name','status','bytes','total','speed','error','createdAt','updatedAt','resumable'];
    const cell=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const csv=[columns.join(','),...rows.map(row=>columns.map(key=>cell(row[key])).join(','))].join('\r\n');
    res.writeHead(200,{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="AK_Download_History.csv"','cache-control':'no-store'});return res.end('\uFEFF'+csv);
   }
   if(format==='json'){
    res.writeHead(200,{'content-type':'application/json; charset=utf-8','content-disposition':'attachment; filename="AK_Download_History.json"','cache-control':'no-store'});return res.end(JSON.stringify({app:'AK MUSIC & VIDEO DOWNLOADER',version:APP_VERSION,exportedAt:new Date().toISOString(),jobs:rows},null,2));
   }
   return send(res,400,{error:'format must be csv or json'});
  }
  if(req.method==='POST'&&u.pathname==='/api/jobs'){
   const b=JSON.parse((await readBody(req,20000)).toString());
   const src=new URL(b.url);if(src.protocol!=='https:'||src.username||src.password)throw Error('HTTPS public URL only');
   // Resolve and reject private/local destinations before accepting a queued job.
   // The worker resolves again immediately before connecting to reduce DNS-rebinding risk.
   await resolvePublicHttps(src.href);
   const name=safeName(b.filename||path.basename(src.pathname)||'download');
   const j=queueJob(src.href,name);return send(res,202,{ok:true,job:publicJob(j)});
  }
  if(req.method==='POST'&&u.pathname.startsWith('/api/jobs/')){
   const parts=u.pathname.split('/');const id=parts[3],action=parts[4];
   if(!id||!action)return send(res,400,{error:'Job ID/action தேவை'});
   return send(res,200,{ok:true,job:setJobAction(id,action)});
  }
  if(req.method==='POST'&&u.pathname==='/api/download'){
   const b=JSON.parse((await readBody(req,20000)).toString());const src=new URL(b.url);if(src.protocol!=='https:'||src.username||src.password)throw Error('HTTPS public URL only');const name=safeName(b.filename||path.basename(src.pathname)||'download');const ext=path.extname(name)||'.bin';const final=path.join(DOWNLOADS,Date.now()+'_'+(path.extname(name)?name:name+ext));if(!inside(final,DOWNLOADS))throw Error('Invalid filename');
   const result=await downloadUrl(src.href,final);return send(res,200,{ok:true,name:path.basename(final),bytes:result.bytes,path:'data/downloads/'+path.basename(final)});
  }
  if(req.method==='POST'&&u.pathname.startsWith('/api/convert/')){
   const kind=u.pathname.split('/').pop();const extMap={mp3:'.mp3',wav:'.wav',flac:'.flac',ogg:'.ogg',mp4:'.mp4',webm:'.webm'};if(!extMap[kind])return send(res,400,{error:'Unsupported output format'});
   const original=safeName(decodeURIComponent(req.headers['x-file-name']||'input.bin'));const input=path.join(os.tmpdir(),'ak_'+Date.now()+'_'+original);const output=path.join(DOWNLOADS,Date.now()+'_converted'+extMap[kind]);
   const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>MAX_UPLOAD)throw Error('Maximum input size is 500 MB');chunks.push(c);}fs.writeFileSync(input,Buffer.concat(chunks));
   try{
    let args=['-i',input];
    if(kind==='mp3')args.push('-vn','-codec:a','libmp3lame','-b:a','192k');
    if(kind==='wav')args.push('-vn','-codec:a','pcm_s16le');
    if(kind==='flac')args.push('-vn','-codec:a','flac');
    if(kind==='ogg')args.push('-vn','-codec:a','libvorbis','-q:a','5');
    if(kind==='mp4')args.push('-c:v','libx264','-preset','veryfast','-crf','23','-c:a','aac','-movflags','+faststart');
    if(kind==='webm')args.push('-c:v','libvpx-vp9','-crf','32','-b:v','0','-c:a','libopus');
    args.push(output);await runFfmpeg(args);const st=fs.statSync(output);return send(res,200,{ok:true,name:path.basename(output),bytes:st.size,path:'data/downloads/'+path.basename(output)});
   }finally{fs.rmSync(input,{force:true});}
  }
  if(req.method==='GET'&&u.pathname==='/api/media-info'){
   const filename=safeName(u.searchParams.get('file')||'');
   const full=path.join(DOWNLOADS,filename);
   if(!filename||!fs.existsSync(full)||!inside(full,DOWNLOADS))throw Error('Library கோப்பு கிடைக்கவில்லை');
   const result=await new Promise((resolve,reject)=>{
    const p=spawn(FFPROBE_BIN,['-v','error','-show_format','-show_streams','-of','json',full]);
    let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
    p.on('error',reject);p.on('close',c=>c===0?resolve(JSON.parse(out)):reject(Error(err||'FFprobe failed')));
   });
   const f=result.format||{};
   return send(res,200,{filename,duration:Number(f.duration||0),size:Number(f.size||0),format:f.format_name||'',bitrate:Number(f.bit_rate||0),
    streams:(result.streams||[]).map(x=>({index:x.index,type:x.codec_type,codec:x.codec_name,width:x.width||null,height:x.height||null,sampleRate:x.sample_rate||null,channels:x.channels||null,language:x.tags?.language||'',title:x.tags?.title||''})),
    tags:f.tags||{}});
  }
  if(req.method==='POST'&&u.pathname==='/api/metadata'){
   const b=JSON.parse((await readBody(req,20000)).toString());
   const filename=safeName(b.filename||'');const input=path.join(DOWNLOADS,filename);
   if(!filename||!fs.existsSync(input)||!inside(input,DOWNLOADS)||!fs.statSync(input).isFile())throw Error('Library கோப்பு கிடைக்கவில்லை');
   const ext=path.extname(filename).toLowerCase();
   const supported=['.mp3','.m4a','.aac','.flac','.ogg','.wav','.mp4','.m4v','.mov','.webm'];
   if(!supported.includes(ext))throw Error('இந்த கோப்பு வடிவத்தில் metadata எழுத ஆதரவு இல்லை');
   const fields=['title','artist','album','genre','date','comment'];
   const values={};for(const key of fields){const v=String(b[key]||'').trim();if(v.length>200)throw Error(key+' அதிகபட்சம் 200 எழுத்துகள்');values[key]=v;}
   if(!fields.some(k=>values[k]))throw Error('குறைந்தது ஒரு metadata விவரமாவது உள்ளிடவும்');
   const output=path.join(DOWNLOADS,Date.now()+'_tagged'+ext);
   const args=['-i',input,'-map','0','-c','copy'];
   for(const key of fields)if(values[key])args.push('-metadata',key+'='+values[key]);
   if(ext==='.mp3')args.push('-id3v2_version','3','-write_id3v1','1');
   if(['.mp4','.m4v','.mov','.m4a'].includes(ext))args.push('-movflags','use_metadata_tags');
   args.push(output);
   try{await runFfmpeg(args);const st=fs.statSync(output);return send(res,200,{ok:true,name:path.basename(output),bytes:st.size,note:'அசல் கோப்பு மாற்றப்படவில்லை'});}
   catch(e){fs.rmSync(output,{force:true});throw e;}
  }
  if(req.method==='POST'&&u.pathname==='/api/artwork'){
   const b=JSON.parse((await readBody(req,12*1024*1024)).toString());
   const filename=safeName(b.filename||'');const input=path.join(DOWNLOADS,filename);
   if(!filename||!fs.existsSync(input)||!inside(input,DOWNLOADS)||!fs.statSync(input).isFile())throw Error('Library கோப்பு கிடைக்கவில்லை');
   const ext=path.extname(filename).toLowerCase();
   if(!['.mp3','.m4a','.mp4'].includes(ext))throw Error('Cover Artwork தற்போது MP3, M4A, MP4 கோப்புகளுக்கு மட்டும் ஆதரிக்கப்படுகிறது');
   const mimeType=String(b.mime||'');
   if(!['image/jpeg','image/png'].includes(mimeType))throw Error('JPG அல்லது PNG படத்தை மட்டும் தேர்ந்தெடுக்கவும்');
   const encoded=String(b.data||'').replace(/^data:image\/(?:jpeg|png);base64,/,'');
   if(!encoded||encoded.length>10*1024*1024)throw Error('பட அளவு 7.5 MB-க்குள் இருக்க வேண்டும்');
   const image=Buffer.from(encoded,'base64');
   if(!image.length||image.length>8*1024*1024)throw Error('பட அளவு அனுமதிக்கப்பட்ட வரம்பை மீறுகிறது');
   const signature=mimeType==='image/jpeg'?image.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])):image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
   if(!signature)throw Error('படக் கோப்பின் உண்மையான வடிவம் JPG/PNG அல்ல');
   const temp=path.join(DATA,Date.now()+'_cover'+(mimeType==='image/jpeg'?'.jpg':'.png'));
   const output=path.join(DOWNLOADS,Date.now()+'_artwork'+ext);
   try{
    fs.writeFileSync(temp,image,{flag:'wx'});
    const args=['-i',input,'-i',temp,'-map','0','-map','1:v:0','-c','copy','-disposition:v:0','attached_pic','-metadata:s:v','title=Album cover','-metadata:s:v','comment=Cover (front)'];
    if(ext==='.mp3')args.push('-id3v2_version','3','-write_id3v1','1');
    if(['.m4a','.mp4'].includes(ext))args.push('-movflags','use_metadata_tags');
    args.push('-y',output);await runFfmpeg(args);
    const probe=await new Promise((resolve,reject)=>{const p=spawn(FFPROBE_BIN,['-v','error','-show_streams','-of','json',output]);let out='';p.stdout.on('data',d=>out+=d);p.on('error',reject);p.on('close',c=>c===0?resolve(JSON.parse(out)):reject(Error('Cover verification failed')));});
    if(!(probe.streams||[]).some(x=>x.disposition?.attached_pic===1))throw Error('Cover image output-ல் உறுதிப்படுத்தப்படவில்லை');
    return send(res,200,{ok:true,name:path.basename(output),bytes:fs.statSync(output).size,note:'Cover Artwork சேர்க்கப்பட்டது; அசல் கோப்பு பாதுகாக்கப்பட்டது'});
   }catch(e){fs.rmSync(output,{force:true});throw e;}finally{fs.rmSync(temp,{force:true});}
  }
  if(req.method==='POST'&&u.pathname==='/api/merge'){
   const b=JSON.parse((await readBody(req,30000)).toString());
   const files=Array.isArray(b.filenames)?[...new Set(b.filenames.map(safeName))]:[];
   const kind=String(b.kind||'audio');
   if(files.length<2||files.length>10)throw Error('குறைந்தது 2, அதிகபட்சம் 10 கோப்புகளைத் தேர்ந்தெடுக்கவும்');
   if(!['audio','video'].includes(kind))throw Error('வெளியீட்டு வகை தவறானது');
   const inputs=files.map(name=>{const full=path.join(DOWNLOADS,name);if(!name||!inside(full,DOWNLOADS)||!fs.existsSync(full)||!fs.statSync(full).isFile())throw Error('Library கோப்பு கிடைக்கவில்லை: '+name);return full;});
   const probes=await Promise.all(inputs.map(full=>new Promise((resolve,reject)=>{
    const p=spawn(FFPROBE_BIN,['-v','error','-show_entries','stream=codec_type','-of','json',full]);let out='',err='';
    p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);
    p.on('close',c=>{if(c!==0)return reject(Error(err||'Media probe failed'));try{resolve(JSON.parse(out).streams||[])}catch(e){reject(e)}});
   })));
   if(kind==='audio'&&probes.some(a=>!a.some(x=>x.codec_type==='audio')))throw Error('தேர்ந்தெடுத்த எல்லா கோப்புகளிலும் Audio இருக்க வேண்டும்');
   if(kind==='audio'&&probes.some(a=>a.some(x=>x.codec_type==='video')))throw Error('Audio Merge-க்கு Audio-only கோப்புகளை மட்டும் தேர்ந்தெடுக்கவும்');
   if(kind==='video'&&probes.some(a=>!a.some(x=>x.codec_type==='video')))throw Error('Video Merge-க்கு எல்லா கோப்புகளிலும் Video இருக்க வேண்டும்');
   const output=path.join(DOWNLOADS,Date.now()+'_merged'+(kind==='audio'?'.mp3':'.mp4'));
   const args=[];for(const full of inputs)args.push('-i',full);
   if(kind==='audio')args.push('-vn','-filter_complex',`concat=n=${inputs.length}:v=0:a=1[outa]`,'-map','[outa]','-c:a','libmp3lame','-b:a','192k');
   else args.push('-filter_complex',`concat=n=${inputs.length}:v=1:a=0[outv]`,'-map','[outv]','-c:v','libx264','-preset','veryfast','-crf','23','-an','-movflags','+faststart');
   args.push(output);
   try{
    await runFfmpeg(args);
    const verify=await new Promise((resolve,reject)=>{const p=spawn(FFPROBE_BIN,['-v','error','-show_entries','stream=codec_type','-of','json',output]);let out='';p.stdout.on('data',d=>out+=d);p.on('error',reject);p.on('close',c=>c===0?resolve(JSON.parse(out).streams||[]):reject(Error('Merged output verification failed')))});
    if(!verify.some(x=>x.codec_type===(kind==='audio'?'audio':'video')))throw Error('Merged output-ல் தேவையான media stream இல்லை');
    return send(res,200,{ok:true,name:path.basename(output),bytes:fs.statSync(output).size,inputs:files.length,note:'Merge முடிந்தது; அசல் கோப்புகள் பாதுகாக்கப்பட்டன'});
   }catch(e){fs.rmSync(output,{force:true});throw e;}
  }
  if(req.method==='POST'&&u.pathname==='/api/extract-track'){
   const b=JSON.parse((await readBody(req,12000)).toString());
   const filename=safeName(b.filename||'');const input=path.join(DOWNLOADS,filename);
   if(!filename||!inside(input,DOWNLOADS)||!fs.existsSync(input)||!fs.statSync(input).isFile())throw Error('Library கோப்பு கிடைக்கவில்லை');
   const streamIndex=Number(b.streamIndex);const kind=String(b.kind||'audio');
   if(!Number.isInteger(streamIndex)||streamIndex<0||!['audio','subtitle'].includes(kind))throw Error('Track தேர்வு தவறானது');
   const probe=await new Promise((resolve,reject)=>{const p=spawn(FFPROBE_BIN,['-v','error','-show_streams','-of','json',input]);let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c===0?resolve(JSON.parse(out).streams||[]):reject(Error(err||'Media probe failed')));});
   const stream=probe.find(x=>x.index===streamIndex);
   if(!stream||stream.codec_type!==(kind==='audio'?'audio':'subtitle'))throw Error('தேர்ந்தெடுத்த Track இந்த கோப்பில் இல்லை');
   const ext=kind==='audio'?'.mp3':'.srt';
   const output=path.join(DOWNLOADS,Date.now()+(kind==='subtitle'?'_subtitle':'_audio_track')+ext);
   const args=['-i',input,'-map','0:'+streamIndex];
   if(kind==='audio')args.push('-vn','-sn','-dn','-c:a','libmp3lame','-b:a','192k');
   else args.push('-vn','-an','-dn','-c:s','srt');
   args.push(output);
   try{
    await runFfmpeg(args);
    const st=fs.statSync(output);if(!st.size)throw Error('வெளியீட்டு கோப்பு காலியாக உள்ளது');
    return send(res,200,{ok:true,name:path.basename(output),bytes:st.size,kind,sourceStream:streamIndex,note:kind==='audio'?'தேர்ந்தெடுத்த Audio Track MP3 ஆக பிரிக்கப்பட்டது':'தேர்ந்தெடுத்த Subtitle Track SRT ஆக பிரிக்கப்பட்டது'});
   }catch(e){fs.rmSync(output,{force:true});throw e;}
  }
  if(req.method==='POST'&&u.pathname==='/api/trim'){
   const b=JSON.parse((await readBody(req,20000)).toString());
   const filename=safeName(b.filename||'');const input=path.join(DOWNLOADS,filename);
   if(!filename||!fs.existsSync(input)||!inside(input,DOWNLOADS))throw Error('Library கோப்பு கிடைக்கவில்லை');
   const start=Number(b.start),end=Number(b.end);
   if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end-start>7200)throw Error('தொடக்க / முடிவு நேரம் சரிபார்க்கவும் (அதிகபட்சம் 2 மணி)');
   const info=await new Promise((resolve,reject)=>{
    const p=spawn(FFPROBE_BIN,['-v','error','-show_format','-show_streams','-of','json',input]);let out='',err='';
    p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);
    p.on('close',c=>c===0?resolve(JSON.parse(out)):reject(Error(err||'Media duration கிடைக்கவில்லை')));
   });
   const duration=Number(info.format?.duration||0);
   if(!Number.isFinite(duration)||end>duration+0.05)throw Error('முடிவு நேரம் கோப்பின் மொத்த நேரத்தை மீறுகிறது');
   const ext=path.extname(filename).toLowerCase()||'.mp4';
   const output=path.join(DOWNLOADS,Date.now()+'_trimmed'+ext);
   const hasVideo=(info.streams||[]).some(x=>x.codec_type==='video');
   const hasAudio=(info.streams||[]).some(x=>x.codec_type==='audio');
   if(!hasVideo&&!hasAudio)throw Error('Audio/Video stream இல்லை');
   let args=['-i',input,'-ss',String(start),'-t',String(end-start),'-map','0:v?','-map','0:a?'];
   if(hasVideo){
    if(ext==='.webm'){args.push('-c:v','libvpx-vp9','-crf','32','-b:v','0');}
    else {args.push('-c:v','libx264','-preset','veryfast','-crf','23');}
   }
   if(hasAudio){
    if(ext==='.mp3')args.push('-c:a','libmp3lame','-b:a','192k');
    else if(ext==='.wav')args.push('-c:a','pcm_s16le');
    else if(ext==='.flac')args.push('-c:a','flac');
    else if(ext==='.ogg')args.push('-c:a','libvorbis','-q:a','5');
    else if(ext==='.webm')args.push('-c:a','libopus');
    else args.push('-c:a','aac','-b:a','192k');
   }
   if(ext==='.mp4'||ext==='.m4v'||ext==='.mov')args.push('-movflags','+faststart');
   args.push(output);
   try{
    await runFfmpeg(args);
    const st=fs.statSync(output);
    const actual=await new Promise((resolve,reject)=>{
     const p=spawn(FFPROBE_BIN,['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',output]);let out='';
     p.stdout.on('data',d=>out+=d);p.on('error',reject);p.on('close',c=>c===0?resolve(Number(out.trim())):reject(Error('Output verification failed')));
    });
    if(!Number.isFinite(actual)||Math.abs(actual-(end-start))>0.25)throw Error('வெளியீட்டு நேரச் சரிபார்ப்பு தோல்வி');
    return send(res,200,{ok:true,name:path.basename(output),bytes:st.size,duration:actual,encoding:'re-encoded'});
   }catch(e){fs.rmSync(output,{force:true});throw e;}
  }
  if(req.method==='GET'&&u.pathname==='/api/library'){
   return send(res,200,{items:libraryRows(u.searchParams.get('q')||'',u.searchParams.get('favorites')==='1')});
  }
  if(req.method==='DELETE'&&u.pathname.startsWith('/api/library/')){
   const filename=safeName(decodeURIComponent(u.pathname.slice('/api/library/'.length)));
   const full=path.join(DOWNLOADS,filename);
   if(!filename||!inside(full,DOWNLOADS)||!fs.existsSync(full)||!fs.statSync(full).isFile())return send(res,404,{error:'கோப்பு கிடைக்கவில்லை'});
   db.prepare('DELETE FROM playlist_items WHERE filename=?').run(filename);
   db.prepare('DELETE FROM media_files WHERE filename=?').run(filename);
   fs.rmSync(full,{force:true});
   return send(res,200,{ok:true,deleted:filename});
  }
  if(req.method==='POST'&&u.pathname.startsWith('/api/library/')){
   const filename=decodeURIComponent(u.pathname.slice('/api/library/'.length));
   const row=db.prepare('SELECT favorite FROM media_files WHERE filename=?').get(filename);
   if(!row)return send(res,404,{error:'கோப்பு கிடைக்கவில்லை'});
   db.prepare('UPDATE media_files SET favorite=? WHERE filename=?').run(row.favorite?0:1,filename);
   return send(res,200,{ok:true,favorite:!row.favorite});
  }
  if(req.method==='POST'&&u.pathname==='/api/playlists'){
   const b=JSON.parse((await readBody(req,10000)).toString());const name=safeName(b.name);
   if(!name)throw Error('Playlist பெயர் தேவை');
   db.prepare('INSERT OR IGNORE INTO playlists(name,created) VALUES(?,?)').run(name,new Date().toISOString());
   const p=db.prepare('SELECT id,name,created FROM playlists WHERE name=?').get(name);
   return send(res,200,{playlist:p});
  }
  if(req.method==='POST'&&/^\/api\/playlists\/\d+\/items$/.test(u.pathname)){
   const id=Number(u.pathname.split('/')[3]);const b=JSON.parse((await readBody(req,10000)).toString());
   const filename=safeName(b.filename||'');
   const playlist=db.prepare('SELECT id FROM playlists WHERE id=?').get(id);
   if(!playlist||!filename||!fs.existsSync(path.join(DOWNLOADS,filename)))throw Error('Playlist அல்லது கோப்பு கிடைக்கவில்லை');
   db.prepare('INSERT OR IGNORE INTO playlist_items(playlist_id,filename,position) VALUES(?,?,COALESCE((SELECT MAX(position)+1 FROM playlist_items WHERE playlist_id=?),0))').run(id,filename,id);
   return send(res,200,{ok:true});
  }
  if(req.method==='GET'&&u.pathname==='/api/playlists'){
   return send(res,200,{playlists:db.prepare(`SELECT p.id,p.name,p.created,COUNT(i.filename) AS item_count FROM playlists p LEFT JOIN playlist_items i ON i.playlist_id=p.id GROUP BY p.id ORDER BY p.name`).all()});
  }
  if(req.method==='PATCH'&&/^\/api\/playlists\/\d+$/.test(u.pathname)){
   const id=Number(u.pathname.split('/')[3]);
   const b=JSON.parse((await readBody(req,10000)).toString());
   const name=String(b.name||'').trim().normalize('NFKC').slice(0,80);
   if(!name)return send(res,400,{error:'Playlist பெயர் தேவை'});
   if(!db.prepare('SELECT id FROM playlists WHERE id=?').get(id))return send(res,404,{error:'Playlist கிடைக்கவில்லை'});
   try{db.prepare('UPDATE playlists SET name=? WHERE id=?').run(name,id);}
   catch(e){if(String(e.message).includes('UNIQUE'))return send(res,409,{error:'இந்தப் பெயரில் Playlist ஏற்கனவே உள்ளது'});throw e;}
   return send(res,200,{ok:true,playlist:db.prepare('SELECT id,name,created FROM playlists WHERE id=?').get(id)});
  }
  if(req.method==='DELETE'&&/^\/api\/playlists\/\d+$/.test(u.pathname)){
   const id=Number(u.pathname.split('/')[3]);
   const result=db.prepare('DELETE FROM playlists WHERE id=?').run(id);
   if(!result.changes)return send(res,404,{error:'Playlist கிடைக்கவில்லை'});
   db.prepare('DELETE FROM playlist_items WHERE playlist_id=?').run(id);
   return send(res,200,{ok:true,deleted:id});
  }
  if(req.method==='DELETE'&&/^\/api\/playlists\/\d+\/items\//.test(u.pathname)){
   const parts=u.pathname.split('/');const id=Number(parts[3]);
   const filename=safeName(decodeURIComponent(parts.slice(5).join('/')));
   const result=db.prepare('DELETE FROM playlist_items WHERE playlist_id=? AND filename=?').run(id,filename);
   if(!result.changes)return send(res,404,{error:'Playlist பாடல் கிடைக்கவில்லை'});
   return send(res,200,{ok:true,removed:filename});
  }
  if(req.method==='POST'&&/^\/api\/playlists\/\d+\/import-m3u$/.test(u.pathname)){
   const id=Number(u.pathname.split('/')[3]);
   const playlist=db.prepare('SELECT id FROM playlists WHERE id=?').get(id);
   if(!playlist)return send(res,404,{error:'Playlist கிடைக்கவில்லை'});
   const b=JSON.parse((await readBody(req,2*1024*1024)).toString());
   const content=String(b.content||'');
   if(!content.trim()||content.length>2*1024*1024)return send(res,400,{error:'M3U கோப்பு காலியாக உள்ளது அல்லது மிகப் பெரியது'});
   const accepted=[];const skipped=[];const seen=new Set();
   for(const raw of content.replace(/^\uFEFF/,'').split(/\r?\n/)){
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    // Import only files already present in this app's Downloads folder; never fetch external URLs.
    if(/^https?:\/\//i.test(line)||line.startsWith('\\\\')){skipped.push(line);continue;}
    const candidate=safeName(path.basename(line.replace(/\\/g,'/')));
    if(!candidate||seen.has(candidate)||!fs.existsSync(path.join(DOWNLOADS,candidate))||!fs.statSync(path.join(DOWNLOADS,candidate)).isFile()){skipped.push(line);continue;}
    seen.add(candidate);accepted.push(candidate);
   }
   const add=db.prepare('INSERT OR IGNORE INTO playlist_items(playlist_id,filename,position) VALUES(?,?,COALESCE((SELECT MAX(position)+1 FROM playlist_items WHERE playlist_id=?),0))');
   for(const name of accepted)add.run(id,name,id);
   return send(res,200,{ok:true,imported:accepted.length,skipped:skipped.length,filenames:accepted});
  }
  if(req.method==='PUT'&&/^\/api\/playlists\/\d+\/reorder$/.test(u.pathname)){
   const id=Number(u.pathname.split('/')[3]);
   if(!db.prepare('SELECT id FROM playlists WHERE id=?').get(id))return send(res,404,{error:'Playlist கிடைக்கவில்லை'});
   const b=JSON.parse((await readBody(req,200000)).toString());
   if(!Array.isArray(b.filenames)||b.filenames.length>5000)return send(res,400,{error:'பாடல் பட்டியல் தவறானது'});
   const current=db.prepare('SELECT filename FROM playlist_items WHERE playlist_id=?').all(id).map(x=>x.filename);
   const requested=b.filenames.map(x=>String(x));
   if(requested.length!==current.length||new Set(requested).size!==requested.length||requested.some(x=>!current.includes(x)))return send(res,400,{error:'பட்டியலில் உள்ள எல்லா பாடல்களையும் ஒருமுறை மட்டும் குறிப்பிடவும்'});
   const update=db.prepare('UPDATE playlist_items SET position=? WHERE playlist_id=? AND filename=?');
   db.exec('BEGIN IMMEDIATE');
   try{requested.forEach((name,index)=>update.run(index,id,name));db.exec('COMMIT');}
   catch(e){db.exec('ROLLBACK');throw e;}
   return send(res,200,{ok:true,updated:requested.length});
  }
  if(req.method==='GET'&&/^\/api\/playlists\/\d+\/export\.m3u$/.test(u.pathname)){
   const id=Number(u.pathname.split('/')[3]);
   const playlist=db.prepare('SELECT id,name FROM playlists WHERE id=?').get(id);
   if(!playlist)return send(res,404,{error:'Playlist கிடைக்கவில்லை'});
   const items=db.prepare('SELECT filename FROM playlist_items WHERE playlist_id=? ORDER BY position,filename').all(id);
   const lines=['#EXTM3U'];
   for(const item of items){
    const filename=safeName(item.filename);
    if(fs.existsSync(path.join(DOWNLOADS,filename)))lines.push(path.join(DOWNLOADS,filename));
   }
   const body=lines.join('\\r\\n')+'\\r\\n';
   const exportName=safeName(playlist.name).replace(/\\.[^.]+$/,'')||'playlist';
   res.writeHead(200,{'content-type':'audio/x-mpegurl; charset=utf-8','content-disposition':`attachment; filename="${exportName}.m3u"`,'cache-control':'no-store'});
   return res.end(body);
  }
  if(req.method==='GET'&&/^\/api\/playlists\/\d+\/items$/.test(u.pathname)){
   const id=Number(u.pathname.split('/')[3]);const playlist=db.prepare('SELECT id,name FROM playlists WHERE id=?').get(id);
   if(!playlist)return send(res,404,{error:'Playlist கிடைக்கவில்லை'});
   const items=db.prepare('SELECT i.filename,m.size,m.format,m.favorite FROM playlist_items i LEFT JOIN media_files m ON m.filename=i.filename WHERE i.playlist_id=? ORDER BY i.position,i.filename').all(id);
   return send(res,200,{playlist,items});
  }
  if(req.method==='POST'&&u.pathname==='/api/backup'){
   return send(res,200,backupData());
  }
  if(req.method==='POST'&&u.pathname==='/api/restore'){
   const b=JSON.parse((await readBody(req,5*1024*1024)).toString());
   if(b.app!=='AK MUSIC & VIDEO DOWNLOADER'||!Array.isArray(b.library)||!Array.isArray(b.jobs))throw Error('Backup கோப்பு சரியானதல்ல');
   const add=db.prepare(`INSERT INTO media_files(filename,size,modified,format,favorite) VALUES(?,?,?,?,?)
    ON CONFLICT(filename) DO UPDATE SET size=excluded.size,modified=excluded.modified,format=excluded.format,favorite=excluded.favorite`);
   const tx=db.prepare('SELECT 1');
   db.exec('BEGIN');
   try{
    for(const x of b.library){const fn=safeName(x.filename);if(fn&&Number.isFinite(Number(x.size)))add.run(fn,Math.max(0,Number(x.size)),String(x.modified||''),safeName(x.format||'unknown'),x.favorite?1:0);}
    const playlistIds=new Map();
    if(Array.isArray(b.playlists))for(const p of b.playlists){
     const name=safeName(p.name);if(!name)continue;
     db.prepare('INSERT OR IGNORE INTO playlists(name,created) VALUES(?,?)').run(name,String(p.created||new Date().toISOString()));
     const saved=db.prepare('SELECT id FROM playlists WHERE name=?').get(name);playlistIds.set(Number(p.id),saved.id);
    }
    if(Array.isArray(b.playlistItems))for(const item of b.playlistItems){
     const pid=playlistIds.get(Number(item.playlist_id));const fn=safeName(item.filename);
     if(pid&&fn&&fs.existsSync(path.join(DOWNLOADS,fn)))db.prepare('INSERT OR IGNORE INTO playlist_items(playlist_id,filename,position) VALUES(?,?,?)').run(pid,fn,Number.isInteger(item.position)?Math.max(0,item.position):db.prepare('SELECT COALESCE(MAX(position)+1,0) AS p FROM playlist_items WHERE playlist_id=?').get(pid).p);
    }
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   jobs=b.jobs.slice(0,500).filter(j=>j&&typeof j==='object').map(j=>({
    id:safeName(j.id||Date.now().toString(36)),
    url:String(j.url||''),
    name:safeName(j.name||'download'),
    status:['completed','cancelled','failed','paused'].includes(j.status)?j.status:'paused',
    bytes:Math.max(0,Number(j.bytes)||0),total:Math.max(0,Number(j.total)||0),speed:0,
    error:'Restore செய்யப்பட்ட வேலை; தொடர Resume செய்யவும்',
    createdAt:String(j.createdAt||new Date().toISOString()),updatedAt:new Date().toISOString(),
    resumable:!!j.resumable
   }));persistJobs();
   return send(res,200,{ok:true,restoredLibrary:b.library.length,restoredJobs:jobs.length});
  }
  if(req.method==='GET'&&u.pathname==='/api/files'){
   const files=fs.readdirSync(DOWNLOADS).map(n=>{const s=fs.statSync(path.join(DOWNLOADS,n));return{name:n,bytes:s.size,modified:s.mtime.toISOString()};}).sort((a,b)=>b.modified.localeCompare(a.modified));return send(res,200,{files});
  }
  if(req.method==='GET'&&u.pathname.startsWith('/stream/')){
   const name=path.basename(decodeURIComponent(u.pathname.slice('/stream/'.length)));
   const file=path.join(DOWNLOADS,name);
   if(!name||!inside(file,DOWNLOADS)||!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,{error:'File not found'});
   const stat=fs.statSync(file),type=mime[path.extname(name).toLowerCase()]||'application/octet-stream';
   const range=req.headers.range;
   res.setHeader('accept-ranges','bytes');res.setHeader('content-type',type);res.setHeader('cache-control','no-store');
   if(range){
    const m=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!m)return send(res,416,{error:'Invalid byte range'});
    let start=m[1]?Number(m[1]):Math.max(0,stat.size-Number(m[2]||0));
    let end=m[2]&&m[1]?Number(m[2]):stat.size-1;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=stat.size){res.writeHead(416,{'content-range':`bytes */${stat.size}`});return res.end();}
    end=Math.min(end,stat.size-1);
    res.writeHead(206,{'content-range':`bytes ${start}-${end}/${stat.size}`,'content-length':end-start+1});
    return fs.createReadStream(file,{start,end}).pipe(res);
   }
   res.writeHead(200,{'content-length':stat.size});return fs.createReadStream(file).pipe(res);
  }
  if(req.method==='GET'&&u.pathname.startsWith('/files/')){
   const name=path.basename(decodeURIComponent(u.pathname.slice(7)));const p=path.join(DOWNLOADS,name);if(!inside(p,DOWNLOADS)||!fs.existsSync(p))return send(res,404,{error:'File not found'});res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(name)}`});return fs.createReadStream(p).pipe(res);
  }
  if(req.method==='GET'){
   const rel=u.pathname==='/'?'index.html':u.pathname.slice(1);const p=path.resolve(PUBLIC,rel);if(!inside(p,PUBLIC)&&p!==path.join(PUBLIC,'index.html')){res.writeHead(403);return res.end('Forbidden');}
   if(!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);return res.end('Not found');}
   res.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'});return fs.createReadStream(p).pipe(res);
  }
  send(res,404,{error:'Not found'});
 }catch(e){send(res,400,{error:e.message||'Request failed'});}
});

// Bound inbound HTTP resource usage and close persistent state cleanly on exit.
server.headersTimeout = 15_000;
server.requestTimeout = 120_000;
server.keepAliveTimeout = 5_000;
let shuttingDown = false;
function gracefulShutdown(signal) {
 if (shuttingDown) return;
 shuttingDown = true;
 console.log(`AK Downloader shutting down (${signal})`);
 const active = jobs.find(j => j.id === activeJobId);
 if (active && active.status === 'downloading') stopJob(active, 'paused', 'சேவையகம் மூடப்பட்டது; மீண்டும் தொடங்க Resume அழுத்தவும்');
 try { persistJobs(); } catch (e) { console.error('Could not persist jobs:', e.message); }
 server.close(() => {
  try { db.close(); } catch (e) { console.error('Database close failed:', e.message); }
 });
 const force = setTimeout(() => {
  try { db.close(); } catch {}
  process.exit(1);
 }, 8_000);
 force.unref();
}
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
server.listen(PORT,'127.0.0.1',()=>console.log(`AK Downloader v1.31.0 running: http://127.0.0.1:${PORT}`));
