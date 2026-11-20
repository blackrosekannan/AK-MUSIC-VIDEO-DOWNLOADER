// Offline release regression tests. Uses only Node.js built-ins and a temporary data directory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');

const root = __dirname;
const packageVersion = require('./package.json').version;
const homeHtml = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
assert.ok(homeHtml.includes(`v${packageVersion.replace(/\.0$/, '')}`), 'visible app version matches package version');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ak-downloader-test-'));
const downloads = path.join(temp, 'downloads');
fs.mkdirSync(downloads, { recursive: true });
const fixtureName = 'range-fixture.mp3';
const fixture = Buffer.from('AK-DOWNLOADER-RANGE-TEST-0123456789');
// Windows installer workflow must be runnable manually and on supported branch changes.
const windowsWorkflow = fs.readFileSync(path.join(__dirname, '.github/workflows/build-windows.yml'), 'utf8');
assert.match(windowsWorkflow, /workflow_dispatch:/, 'Windows workflow can be run manually');
assert.match(windowsWorkflow, /pull_request:/, 'Windows workflow checks pull requests');
assert.ok(windowsWorkflow.includes('- main') && windowsWorkflow.includes('- master'), 'Windows workflow checks main and master');
assert.match(windowsWorkflow, /npm run dist:win/, 'Windows installer build command');
assert.match(windowsWorkflow, /Get-FileHash/, 'Windows installer SHA-256 verification');
assert.match(windowsWorkflow, /if-no-files-found: error/, 'Windows installer artifact is required');

// Android WebView must keep only the configured HTTPS service origin in-app.
const androidWorkflowRelease = fs.readFileSync(path.join(__dirname, '.github/workflows/build-android.yml'), 'utf8');
assert.ok(androidWorkflowRelease.includes('Android-APK-V1.56'), 'Android artifact label matches release');
assert.match(androidWorkflowRelease, /assembleDebug/, 'Android workflow builds debug APK');
assert.match(androidWorkflowRelease, /sha256sum -c/, 'Android workflow verifies APK checksum');
assert.match(androidWorkflowRelease, /dump badging/, 'Android workflow verifies APK package metadata');
assert.ok(windowsWorkflow.includes('Windows-Installer-V1.56'), 'Windows artifact label matches release');

// Android native wrapper source/configuration smoke checks.
for (const file of [
  'android/settings.gradle', 'android/build.gradle', 'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/java/in/ak/downloader/MainActivity.java'
]) {
  assert.ok(fs.existsSync(path.join(__dirname, file)), `Android source file exists: ${file}`);
}
const androidManifest = fs.readFileSync(path.join(__dirname, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
assert.match(androidManifest, /android.permission.INTERNET/, 'Android internet permission');
assert.match(androidManifest, /android:usesCleartextTraffic="false"/, 'Android cleartext traffic disabled');
const androidActivity = fs.readFileSync(path.join(__dirname, 'android/app/src/main/java/in/ak/downloader/MainActivity.java'), 'utf8');
assert.ok(androidActivity.includes('isConfiguredServer(uri)'), 'Android WebView restricts in-app navigation to configured server');
assert.doesNotMatch(androidActivity, /127\.0\.0\.1.*return false/, 'Android app does not allow cleartext loopback navigation');
assert.ok(androidActivity.includes('Intent(Intent.ACTION_VIEW, uri)'), 'external HTTPS navigation opens in system browser');

for (const token of [
  /DownloadManager/, /SERVER_KEY/, /setJavaScriptEnabled\(true\)/,
  /setMixedContentMode\(WebSettings\.MIXED_CONTENT_NEVER_ALLOW\)/,
  /setSafeBrowsingEnabled\(true\)/, /URLUtil\.guessFileName/,
  /ACTION_VIEW_DOWNLOADS/, /POST_NOTIFICATIONS/, /onRequestPermissionsResult/,
  /TYPE_TEXT_VARIATION_URI/, /onShowFileChooser/, /onProgressChanged/,
  /webView\.reload\(\)/, /onDestroy\(\)/, /setAllowFileAccess\(false\)/,
  /onReceiveValue\(results\)/
]) assert.match(androidActivity, token, `Android source requirement: ${token}`);
assert.match(androidActivity, /Button serverButton = new Button\(this\)/, 'Android toolbar server button has distinct local name');
assert.match(androidActivity, /WebSettings settings = webView\.getSettings\(\)/, 'Android WebSettings initialization');
assert.match(androidActivity, /uri.getUserInfo\(\) != null/, 'Android download URL rejects embedded credentials');
assert.match(androidActivity, /fileCallback.onReceiveValue\(null\)/, 'Android file chooser callback is cancelled safely');
assert.match(androidActivity, /callback.onReceiveValue\(results\)/, 'Android file chooser callback is completed safely');
// Android workflow release assertions continue using androidWorkflowRelease above.
assert.match(androidWorkflowRelease, /name: Run source and release tests/, 'Android workflow source test step');
assert.match(androidWorkflowRelease, /branches:\s*\n\s*- main\s*\n\s*- master/, 'Android workflow builds main/master branches');
assert.match(androidWorkflowRelease, /pull_request:/, 'Android workflow validates pull requests');
assert.match(androidWorkflowRelease, /gradle --no-daemon --stacktrace clean assembleDebug/, 'Android workflow clean APK build command');
assert.ok(androidWorkflowRelease.includes('Android-APK-V1.56'), 'Android workflow artifact version');
assert.doesNotMatch(androidWorkflowRelease, /\\n/, 'Android workflow contains no escaped newline artifacts');
const androidBuild = fs.readFileSync(path.join(__dirname, 'android/app/build.gradle'), 'utf8');
assert.match(androidBuild, /versionCode 156/, 'Android version code');
assert.match(androidBuild, /versionName '1.56.0'/, 'Android version name');

fs.writeFileSync(path.join(downloads, fixtureName), fixture);
const port = 19000 + Math.floor(Math.random() * 10000);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [path.join(root, 'server.js')], {
  cwd: root,
  env: { ...process.env, PORT: String(port), AK_DATA_DIR: temp },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
child.stdout.on('data', d => logs += d.toString());
child.stderr.on('data', d => logs += d.toString());

function request(method, pathname, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request(base + pathname, {
      method,
      headers: { ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {}), ...headers }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
async function waitReady() {
  const until = Date.now() + 12000;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw Error(`Server exited early: ${logs}`);
    try { const r = await request('GET', '/api/health'); if (r.status === 200) return; } catch {}
    await new Promise(r => setTimeout(r, 150));
  }
  throw Error(`Server startup timeout: ${logs}`);
}
(async () => {
  try {
    await waitReady();
    let r = await request('GET', '/api/health');
    assert.equal(r.status, 200, 'health endpoint status');
    let health = JSON.parse(r.body);
    assert.equal(health.ok, true, 'health ok');
    assert.equal(r.headers['x-content-type-options'], 'nosniff', 'MIME sniffing disabled');
    assert.equal(r.headers['x-frame-options'], 'DENY', 'clickjacking protection enabled');
    assert.equal(r.headers['referrer-policy'], 'no-referrer', 'referrer data not sent');
    assert.equal(r.headers['permissions-policy'], 'camera=(), microphone=(), geolocation=()', 'unused device permissions disabled');
    assert.equal(health.version, '1.56.0', 'health version');
    const downloadSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    assert.match(downloadSource, /res\.on\('aborted'/, 'interrupted HTTP response is detected');
    assert.match(downloadSource, /!res\.complete/, 'incomplete HTTP response is rejected');
    assert.match(downloadSource, /received!==expectedResponseBytes/, 'download content-length is verified');
    assert.match(downloadSource, /out\.once\('close'/, 'partial download byte count is reconciled after stream close');
    assert.match(downloadSource, /fs\.statSync\(dest\)\.size/, 'resume offset matches bytes persisted on disk');
    assert.equal(typeof health.ffmpeg, 'boolean');
    assert.equal(typeof health.ffprobe, 'boolean');

    r = await request('GET', '/');
    assert.equal(r.status, 200, 'web app root');
    assert.match(r.headers['content-type'], /text\/html/);

    r = await request('GET', '/manifest.webmanifest');
    assert.equal(r.status, 200, 'PWA manifest served');
    assert.match(r.headers['content-type'], /application\/manifest\+json/);
    const manifest = JSON.parse(r.body);
    assert.equal(manifest.display, 'standalone', 'PWA standalone display');
    assert.ok(manifest.icons.some(icon => icon.src === '/icon.svg'), 'PWA icon configured');
    r = await request('GET', '/sw.js');
    assert.equal(r.status, 200, 'PWA service worker served');
    assert.match(r.body.toString(), /startsWith\('\/api\/'\)/, 'API requests excluded from offline cache');
    r = await request('GET', '/icon.svg');
    assert.equal(r.status, 200, 'PWA icon served');

    r = await request('GET', '/api/storage');
    assert.equal(r.status, 200, 'storage endpoint');
    const storage = JSON.parse(r.body);
    assert.ok(storage.totalBytes > 0, 'disk total bytes');
    assert.ok(storage.freeBytes >= 0, 'disk free bytes');
    assert.equal(storage.libraryCount, 0, 'initial library count');
    assert.equal(storage.downloadBytes, fixture.length, 'download directory bytes');

    // Download history export supports both CSV and JSON without exposing source URLs.
    r = await request('GET', '/api/jobs/export?format=csv');
    assert.equal(r.status, 200, 'download history CSV export');
    assert.match(r.headers['content-type'], /text\/csv/);
    assert.ok(r.body.toString().startsWith('\uFEFFid,name,status'), 'CSV header and UTF-8 BOM');
    r = await request('GET', '/api/jobs/export?format=json');
    assert.equal(r.status, 200, 'download history JSON export');
    assert.equal(JSON.parse(r.body).version, '1.56.0');
    assert.deepEqual(JSON.parse(r.body).jobs, []);
    r = await request('GET', '/api/jobs/export?format=xml');
    assert.equal(r.status, 400, 'unsupported history format rejected');

    // Queue API must reject insecure schemes and expose a stable empty queue.
    r = await request('GET', '/api/jobs');
    assert.equal(r.status, 200, 'download jobs endpoint');
    assert.deepEqual(JSON.parse(r.body).jobs, [], 'initial download queue empty');
    r = await request('POST', '/api/jobs', { url: 'http://example.com/audio.mp3' });
    assert.equal(r.status, 400, 'insecure download URL rejected');
    for (const blockedUrl of [
      'https://127.0.0.1/private.mp3',
      'https://localhost/private.mp3',
      'https://192.168.1.10/private.mp3',
      'https://[::1]/private.mp3',
      'https://[fc00::1]/private.mp3',
      'https://[fe80::1]/private.mp3',
      'https://[::ffff:127.0.0.1]/private.mp3',
      'https://user:pass@example.com/audio.mp3'
    ]) {
      r = await request('POST', '/api/jobs', { url: blockedUrl });
      assert.equal(r.status, 400, `private IPv4/IPv6 or credentialed destination rejected: ${blockedUrl}`);
    }

    r = await request('GET', '/api/files');
    assert.equal(r.status, 200, 'files endpoint');
    assert.ok(JSON.parse(r.body).files.some(x => x.name === fixtureName), 'fixture appears in file listing');

    r = await request('GET', `/stream/${fixtureName}`, undefined, { range: 'bytes=4-11' });
    assert.equal(r.status, 206, 'byte range status');
    assert.equal(r.headers['accept-ranges'], 'bytes');
    assert.equal(r.headers['content-range'], `bytes 4-11/${fixture.length}`);
    assert.deepEqual(r.body, fixture.subarray(4, 12), 'byte range content');

    r = await request('GET', `/stream/${fixtureName}`, undefined, { range: 'bytes=9999-10000' });
    assert.equal(r.status, 416, 'invalid byte range rejected');
    r = await request('GET', `/stream/${fixtureName}`, undefined, { range: 'bytes=-5' });
    assert.equal(r.status, 206, 'suffix byte range status');
    assert.deepEqual(r.body, fixture.subarray(-5), 'suffix byte range content');
    r = await request('GET', `/stream/${fixtureName}`, undefined, { range: 'bytes=bad' });
    assert.equal(r.status, 416, 'malformed byte range rejected');

    r = await request('POST', '/api/playlists', { name: 'Regression Playlist' });
    assert.equal(r.status, 200, 'playlist creation');
    const playlist = JSON.parse(r.body).playlist;
    r = await request('POST', `/api/playlists/${playlist.id}/items`, { filename: fixtureName });
    assert.equal(r.status, 200, 'playlist item insertion');
    r = await request('GET', '/api/playlists');
    assert.equal(JSON.parse(r.body).playlists.find(x => x.id === playlist.id).item_count, 1, 'playlist item count');

    r = await request('GET', `/api/playlists/${playlist.id}/items`);
    assert.equal(r.status, 200, 'playlist item listing');
    assert.equal(JSON.parse(r.body).items[0].filename, fixtureName, 'playlist item filename');
    r = await request('GET', `/api/playlists/${playlist.id}/export.m3u`);
    assert.equal(r.status, 200, 'playlist M3U export/import');
    assert.match(r.headers['content-type'], /mpegurl/);
    assert.match(r.body.toString(), /^#EXTM3U\\r?\\n/);
    assert.ok(r.body.toString().includes(path.join(downloads, fixtureName)), 'M3U uses the actual local media path');
    const importText = '#EXTM3U\r\n' + path.join(downloads, fixtureName) + '\r\nhttps://example.com/private.mp3\r\n' + path.join(downloads, 'missing.mp3');
    r = await request('POST', `/api/playlists/${playlist.id}/import-m3u`, { content: importText });
    if(r.status!==200) console.error('M3U IMPORT RESPONSE',r.body.toString());
    assert.equal(r.status, 200, 'M3U import status');
    const imported = JSON.parse(r.body);
    assert.equal(imported.imported, 1, 'only existing local media imported');
    assert.equal(imported.skipped, 2, 'remote and missing paths skipped');
    r = await request('GET', `/api/playlists/${playlist.id}/items`);
    assert.equal(JSON.parse(r.body).items.length, 1, 'imported playlist item visible');
    const secondFixture='second-order-fixture.mp3';
    fs.writeFileSync(path.join(downloads,secondFixture),Buffer.from('SECOND-FIXTURE'));
    r=await request('POST',`/api/playlists/${playlist.id}/items`,{filename:secondFixture});
    assert.equal(r.status,200,'second playlist item insertion');
    r=await request('GET',`/api/playlists/${playlist.id}/items`);
    assert.deepEqual(JSON.parse(r.body).items.map(x=>x.filename),[fixtureName,secondFixture],'playlist insertion order preserved');
    r=await request('PUT',`/api/playlists/${playlist.id}/reorder`,{filenames:[secondFixture,fixtureName]});
    assert.equal(r.status,200,'playlist reorder');
    r=await request('GET',`/api/playlists/${playlist.id}/items`);
    assert.deepEqual(JSON.parse(r.body).items.map(x=>x.filename),[secondFixture,fixtureName],'playlist custom order saved');
    r=await request('GET',`/api/playlists/${playlist.id}/export.m3u`);
    assert.ok(r.body.toString().indexOf(secondFixture)<r.body.toString().indexOf(fixtureName),'M3U export preserves custom order');
    r=await request('PUT',`/api/playlists/${playlist.id}/reorder`,{filenames:[fixtureName,fixtureName]});
    assert.equal(r.status,400,'duplicate reorder entries rejected');
    r = await request('PATCH', `/api/playlists/${playlist.id}`, { name: 'Renamed Regression Playlist' });
    assert.equal(r.status, 200, 'playlist rename');
    assert.equal(JSON.parse(r.body).playlist.name, 'Renamed Regression Playlist');
    r = await request('DELETE', `/api/playlists/${playlist.id}/items/${encodeURIComponent(fixtureName)}`);
    assert.equal(r.status, 200, 'playlist item removal');
    r = await request('GET', `/api/playlists/${playlist.id}/items`);
    assert.equal(JSON.parse(r.body).items.length, 1, 'selected playlist item removed; other item remains');
    r = await request('POST', `/api/playlists/${playlist.id}/items`, { filename: fixtureName });
    assert.equal(r.status, 200, 'reinsert playlist item');

    r = await request('POST', '/api/backup', {});
    assert.equal(r.status, 200, 'backup endpoint');
    const backup = JSON.parse(r.body);
    assert.equal(backup.version, '1.56.0', 'backup version');
    assert.ok(backup.library.some(x => x.filename === fixtureName), 'backup contains indexed fixture');

    fs.writeFileSync(path.join(downloads, 'restored-test.ogg'), Buffer.from('restored-fixture'));
    backup.library.push({ filename: 'restored-test.ogg', size: 16, modified: new Date().toISOString(), format: 'ogg', favorite: true });
    r = await request('POST', '/api/restore', backup);
    assert.equal(r.status, 200, 'restore endpoint');
    assert.equal(JSON.parse(r.body).ok, true, 'restore success flag');
    r = await request('GET', '/api/library?q=restored-test');
    assert.equal(r.status, 200, 'library endpoint');
    assert.ok(JSON.parse(r.body).items.some(x => x.filename === 'restored-test.ogg' && x.favorite === 1), 'restored library row');

    // Deleting a library file must also remove playlist references and the physical file.
    const deleteName = 'delete-me.wav';
    fs.writeFileSync(path.join(downloads, deleteName), Buffer.from('delete-fixture'));
    r = await request('GET', '/api/library?q=delete-me');
    assert.equal(r.status, 200, 'library indexes deletable fixture');
    r = await request('POST', `/api/playlists/${playlist.id}/items`, { filename: deleteName });
    assert.equal(r.status, 200, 'deletable fixture playlist insertion');
    r = await request('DELETE', `/api/library/${encodeURIComponent(deleteName)}`);
    assert.equal(r.status, 200, 'library file delete');
    assert.equal(JSON.parse(r.body).deleted, deleteName);
    assert.equal(fs.existsSync(path.join(downloads, deleteName)), false, 'physical file deleted');
    r = await request('GET', '/api/playlists');
    assert.equal(JSON.parse(r.body).playlists.find(x => x.id === playlist.id).item_count, 2, 'deleted file removed from playlist; remaining items preserved');

    r = await request('DELETE', `/api/playlists/${playlist.id}`);
    assert.equal(r.status, 200, 'playlist delete');
    r = await request('GET', '/api/playlists');
    assert.equal(JSON.parse(r.body).playlists.some(x => x.id === playlist.id), false, 'playlist deleted');
    assert.equal(fs.existsSync(path.join(downloads, fixtureName)), true, 'playlist deletion preserves media files');

    r = await request('GET', '/api/health', undefined, { origin: 'https://untrusted.example' });
    assert.equal(r.status, 403, 'foreign origin rejected');

    console.log('PASS: health/version, storage metrics, static app, file listing, byte-range streaming, playlist CRUD, persistent custom ordering API, M3U import/export order, backup/restore, library deletion, CORS, download queue validation, CSV/JSON download history export, PWA manifest/service worker and API cache exclusion');
    console.log(`Media tools: FFmpeg=${health.ffmpeg}, FFprobe=${health.ffprobe}`);
  } catch (e) {
    console.error('FAIL:', e.stack || e);
    process.exitCode = 1;
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 1500);
    });
    fs.rmSync(temp, { recursive: true, force: true });
  }
})();


// Android native wrapper source checks (SDK build runs in GitHub Actions).
{
  const fs = require('node:fs');
  const path = require('node:path');
  const androidRoot = path.join(__dirname, 'android', 'app', 'src', 'main');
  const manifest = fs.readFileSync(path.join(androidRoot, 'AndroidManifest.xml'), 'utf8');
  const activity = fs.readFileSync(path.join(androidRoot, 'java', 'in', 'ak', 'downloader', 'MainActivity.java'), 'utf8');
  for (const token of ['android.permission.INTERNET', 'android.permission.POST_NOTIFICATIONS', 'android:exported="true"', 'android:usesCleartextTraffic="false"']) {
    if (!manifest.includes(token)) throw new Error(`Android manifest missing: ${token}`);
  }
  for (const token of ['DownloadManager', 'onShowFileChooser', 'setJavaScriptEnabled(true)', 'https://', 'onBackPressed']) {
    if (!activity.includes(token)) throw new Error(`Android activity missing: ${token}`);
  }
  console.log('PASS: Android manifest, HTTPS server setup, WebView, file chooser, DownloadManager source checks');
}
