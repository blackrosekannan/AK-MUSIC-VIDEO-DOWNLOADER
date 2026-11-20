// AK MUSIC & VIDEO DOWNLOADER - startup diagnostics
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawnSync } = require('node:child_process');
const pkg = require('./package.json');
function resolveBinary(moduleName, fallbackName) {
  try {
    const mod = require(moduleName);
    const candidate = typeof mod === 'string' ? mod : mod?.path;
    if (candidate && fs.existsSync(candidate)) return candidate;
  } catch {}
  return fallbackName;
}
const MIN = [22, 13, 0];
const current = process.versions.node.split('.').map(Number);
const say = (ok, label, detail='') => console.log(`${ok ? '[PASS]' : '[FAIL]'} ${label}${detail ? ' — ' + detail : ''}`);
let failed = false;
function check(ok, label, detail='') { say(ok, label, detail); if (!ok) failed = true; }
function versionAtLeast(a,b) { for (let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true; }
console.log(`AK MUSIC & VIDEO DOWNLOADER v${pkg.version} – System Check`);
check(versionAtLeast(current, MIN), 'Node.js version', `installed ${process.versions.node}; required >= 22.13.0`);
for (const [label, bin] of [['FFmpeg', resolveBinary('ffmpeg-static','ffmpeg')], ['FFprobe', resolveBinary('ffprobe-static','ffprobe')]]) {
  const r = spawnSync(bin, ['-version'], { encoding:'utf8', windowsHide:true });
  const line = (r.stdout || r.stderr || '').split(/\r?\n/)[0];
  check(!r.error && r.status === 0, `${label} availability`, line || (r.error?.message || 'not found in PATH'));
}
const dataDir = path.join(__dirname,'data');
try {
  fs.mkdirSync(dataDir,{recursive:true});
  const probe = path.join(dataDir,`.write-check-${process.pid}`);
  fs.writeFileSync(probe,'ok',{flag:'wx'}); fs.unlinkSync(probe);
  check(true,'Data folder write permission',dataDir);
} catch(e) { check(false,'Data folder write permission',e.message); }
const port = Number(process.env.PORT || 8787);
const tester = net.createServer();
tester.once('error', e => { check(false,'Local port availability',`127.0.0.1:${port} — ${e.code || e.message}; close another app using this port or set PORT`); finish(); });
tester.listen(port,'127.0.0.1',() => { check(true,'Local port availability',`127.0.0.1:${port}`); tester.close(finish); });
function finish(){
  if(failed){ console.log('\nசில தேவைகள் பூர்த்தியாகவில்லை. மேலுள்ள [FAIL] குறிப்புகளை சரிசெய்து மீண்டும் start.bat இயக்கவும்.'); process.exitCode=1; }
  else console.log('\nஅனைத்து தொடக்கச் சரிபார்ப்புகளும் முடிந்தன. start.bat மூலம் செயலியைத் தொடங்கலாம்.');
}
