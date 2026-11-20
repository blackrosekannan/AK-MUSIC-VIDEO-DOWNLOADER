AK MUSIC & VIDEO DOWNLOADER — ULTIMATE SOURCE v1.38
===================================================

V1.38 புதுப்பிப்பு:
- PWA Web App manifest, SVG app icon மற்றும் Service Worker சேர்க்கப்பட்டது.
- Chrome-ல் localhost அல்லது HTTPS மூலம் திறக்கும்போது Install App வசதிக்கான கட்டமைப்பு உள்ளது.
- UI shell மட்டும் offline cache செய்யப்படும்; /api, /stream மற்றும் /files கோரிக்கைகள் cache செய்யப்படாது.
- PWA manifest, service worker, icon மற்றும் API cache exclusion integration tests சேர்க்கப்பட்டன.

முக்கிய வரம்பு:
- இது Android APK அல்ல. தற்போதைய backend Node.js + SQLite + FFmpeg சார்ந்தது; Android-ல் இயங்கும் native backend உருவாக்கப்படவில்லை.
- Service Worker offline-இல் UI-ஐ மட்டும் திறக்க உதவும்; பதிவிறக்கம்/மாற்றம் போன்ற backend பணிகளுக்கு சேவை இயங்க வேண்டும்.
- Server இயல்பாக 127.0.0.1-ல் மட்டுமே கேட்கும்; LAN-ல் பாதுகாப்பற்ற வகையில் திறக்கப்படவில்லை.

AK MUSIC & VIDEO DOWNLOADER — ULTIMATE SOURCE v1.38
===================================================

இந்தப் பதிப்பில் Windows Desktop Installer உருவாக்கும் கட்டமைப்பு மற்றும்
ASAR-ல் உள்ள backend கோப்புகளை சரியாக இயக்கும் திருத்தம் சேர்க்கப்பட்டுள்ளது.
இது Source Code ZIP; இங்கே Windows EXE build செய்யப்படவில்லை.

தேவைகள் (Source இயக்க):
- Windows 10/11 64-bit
- Node.js 22.13 அல்லது அதற்கு மேல்
- npm

Source முறையில் தொடங்க:
1. ZIP-ஐ Extract செய்யவும்.
2. start.bat-ஐ இயக்கவும்.
3. Chrome-ல் http://127.0.0.1:8787 திறக்கவும்.

Windows Installer உருவாக்க (GitHub Actions):
1. இந்த ZIP-ஐ Extract செய்து முழு project-ஐ GitHub repository-க்கு upload செய்யவும்.
2. GitHub-ல் Actions tab திறக்கவும்.
3. “Build Windows Installer” workflow தேர்ந்தெடுத்து “Run workflow” அழுத்தவும்.
   இந்த workflow V1.37 ZIP-இல் .github/workflows/build-windows.yml ஆக இணைக்கப்பட்டுள்ளது.
4. Workflow வெற்றியடைந்ததும் அதன் Artifacts பகுதியில்
   AK-MUSIC-VIDEO-DOWNLOADER-Windows-Installer என்பதைப் பதிவிறக்கவும்.
5. கிடைக்கும் Setup.exe-ஐ Windows 10/11 64-bit கணினியில் நிறுவிச் சோதிக்கவும்.

Build குறிப்பு:
- GitHub Actions Windows runner-ல் Electron Builder மற்றும் NSIS பயன்படுத்தப்படும்.
- FFmpeg/FFprobe package dependencies மூலம் இணைக்கப்படும்.
- Backend server.js மற்றும் அதன் node_modules ASAR-க்கு வெளியே unpack செய்யப்படும்;
  UI public கோப்புறை ASAR-ல் இருக்கும். Desktop shell இதற்கான சரியான பாதைகளைத் தரும்.
- இந்த workflow வெற்றியடையும் வரை EXE உருவானதாகக் கருத வேண்டாம்.

முக்கிய வரம்புகள்:
- இந்தச் சூழலில் npm registry அணுகல் timeout ஆனதால் installer build செய்ய இயலவில்லை.
- Android APK இன்னும் உருவாக்கப்படவில்லை; தற்போதைய Node.js backend-ஐ Android-ல்
  நேரடியாக இயக்கும் Native integration இன்னும் தேவை.
- Windows Installer மற்றும் Android சாதனச் சோதனைகள் நிலுவையில் உள்ளன.
- FFmpeg/FFprobe-ஐ package செய்யும் workflow-இல் binary download கிடைப்பது
  GitHub Actions/network availability-ஐப் பொறுத்தது.

v1.4-ல் மேம்படுத்தப்பட்டவை:
- FFprobe மூலம் Media Info: duration, codec, resolution, bitrate, audio channels, metadata tags.
- Trim Editor: Library-யிலிருந்து கோப்பைத் தேர்வு செய்து start/end seconds கொடுத்து புதிய clip சேமித்தல்.
- Original file மாற்றப்படாது; trimmed output தனிக் கோப்பாக உருவாகும்.

v1.3-ல் மேம்படுத்தப்பட்டவை:
- SQLite database: data/ak_library.sqlite-ல் media file metadata சேமிப்பு.
- Library search, Favorites filter மற்றும் favorite toggle.
- JSON Backup / Restore: library metadata மற்றும் download job விவரங்கள்.
- Batch conversion: ஒரே தேர்வில் பல கோப்புகளை வரிசையாக மாற்றலாம்.
- Playlist உருவாக்கம் மற்றும் Library கோப்புகளை Playlist-ல் சேர்த்தல்.
- SQLite DB தானாக data/ கோப்புறையில் உருவாகும் (Node.js built-in SQLite; experimental warning வரலாம்).

v1.2-ல் மேம்படுத்தப்பட்டவை:
- Download Queue: வேலைகளை வரிசையில் சேர்த்து ஒவ்வொன்றாக செயல்படுத்துதல்.
- Progress: பதிவிறக்கப்பட்ட அளவு, மொத்த அளவு, சதவீதம், வேகம்.
- Pause / Resume / Cancel / Retry கட்டுப்பாடுகள்.
- jobs.json மூலம் வேலை நிலை சேமிப்பு; சேவையகம் மறுதொடங்கினால் நடுவில் நின்ற வேலை Pause ஆகி மீண்டும் Resume செய்யலாம்.
- HTTP Range ஆதரவு இருந்தால் பகுதியிலிருந்து Resume; ஆதரவு இல்லையெனில் பாதுகாப்பாக மீண்டும் தொடங்க வேண்டிய பிழை காட்டப்படும்.

v1.1-ல் மேம்படுத்தப்பட்டவை:
- பதிவிறக்க URL-க்கு HTTPS கட்டாயம்.
- localhost, private, link-local, reserved IPv4/IPv6 முகவரிகள் தடுக்கப்படுகின்றன.
- DNS-ல் கிடைக்கும் எல்லா முகவரிகளும் சரிபார்க்கப்படுகின்றன; சரிபார்த்த IP-க்கே இணைப்பு pin செய்யப்படுகிறது (DNS rebinding அபாயத்தைக் குறைக்க).
- Redirect ஒவ்வொன்றும் மீண்டும் சரிபார்க்கப்படுகிறது.
- Download பிழை ஏற்பட்டால் பகுதி கோப்பு நீக்கப்படும்.
- FFmpeg conversion: MP3, WAV, FLAC, OGG, MP4, WebM.
- Internet Archive திறந்த பட்டியல் தேடல்.
- சேமிக்கப்பட்ட கோப்புகள் பட்டியல் மற்றும் கோப்பைப் பெறுதல்.

முக்கிய வரம்புகள்:
- தேடல் Internet Archive மட்டுமே; இது universal search அல்ல.
- YouTube/Instagram/Facebook universal downloader இல்லை. தள விதிகள், அதிகாரப்பூர்வ API மற்றும் உரிம அனுமதி அவசியம்.
- Download Queue, Progress, Pause/Resume/Cancel/Retry மற்றும் அடிப்படை Job Recovery சேர்க்கப்பட்டுள்ளன. Range ஆதரவு இல்லாத தளங்களில் இடைநிறுத்திய இடத்திலிருந்து தொடர முடியாது.
- SQLite metadata library, Favorites, Backup/Restore மற்றும் அடிப்படை Batch Conversion சேர்க்கப்பட்டுள்ளன. Metadata editing, merging, subtitle/track selection இன்னும் சேர்க்கப்படவில்லை. Trim தற்போது re-encode செய்து output duration-ஐ ffprobe மூலம் சரிபார்க்கிறது; இதனால் செயலாக்க நேரம் அதிகரிக்கலாம்.
- Windows EXE installer, Android APK, PWA build இப்பதிப்பில் இல்லை.
- உண்மையான Windows/Android browser end-to-end சோதனை செய்யப்படவில்லை.
- MP4/WebM conversion source-ல் video stream இல்லாவிட்டால் தோல்வியடையலாம்.
- தனிப்பட்ட/DRM/கட்டுப்படுத்தப்பட்ட உள்ளடக்கத்தை மீறாது.

பாதுகாப்பு குறிப்பு:
- சேவை 127.0.0.1 என்ற இந்தக் கணினிக்குள் மட்டுமே கேட்கிறது.
- HTTPS URL மட்டும் ஏற்கப்படும்.
- DNS மற்றும் IP destination validation சேர்க்கப்பட்டுள்ளது.
- உங்கள் சொந்த அல்லது பதிவிறக்க அனுமதி உள்ள உள்ளடக்கத்தை மட்டும் பயன்படுத்தவும்.

சோதனை நிலை:
- Node.js syntax check செய்யப்பட்டது. SQLite initialization, library metadata, backup/restore API மற்றும் batch conversion UI code சேர்க்கப்பட்டன. Windows/Android end-to-end சோதனை செய்யப்படவில்லை.
- FFmpeg/FFprobe இருப்பு சூழலில் சரிபார்க்கப்பட்டது.
- இந்த வெளியீட்டில் உண்மையான இணைய download மற்றும் browser/device end-to-end சோதனை செய்யப்படவில்லை.


V1.5 புதிய வசதி:
- Library Media Player: MP3, WAV, FLAC, OGG, M4A, AAC, MP4, MOV, WebM போன்ற browser ஆதரிக்கும் கோப்புகளை நேரடியாக இயக்கலாம்.
- HTTP Range streaming சேர்க்கப்பட்டுள்ளது; ஆதரிக்கும் browser/format-ல் seek செய்து முன்னோக்கி/பின்னோக்கி செல்லலாம்.
- Player கோப்பை downloads folder-இல் இருந்து வாசிக்கும்; தனியாக upload தேவையில்லை.

குறிப்பு: FLAC/AAC போன்ற சில codec-களின் browser ஆதரவு browser-ஐப் பொறுத்தது. முழு Windows/Android சாதன சோதனை இன்னும் செய்யப்படவில்லை.


V1.6 புதிய வசதி:
- Metadata Editor: Title, Artist, Album, Genre, Date, Comment ஆகியவற்றை MP3 மற்றும் ஆதரிக்கப்படும் audio/video கோப்புகளில் சேர்க்கலாம்.
- FFmpeg stream-copy முறையில் metadata மட்டும் எழுத முயலும்; அசல் கோப்பு மாற்றப்படாது, புதிய tagged கோப்பு உருவாகும்.
- Metadata எழுதுவதற்கு முன் கோப்பு வடிவம் மற்றும் உள்ளீடுகள் சரிபார்க்கப்படும்.
- Album Artwork / Cover image சேர்க்கும் வசதி இந்தப் பதிப்பில் இல்லை.

சோதனை முடிவுகள் (இந்த build சூழலில்): Node.js syntax PASS; UI JavaScript syntax PASS; API metadata write PASS; FFprobe மூலம் Title/Artist/Album/Genre/Date/Comment மீண்டும் வாசித்தல் PASS; HTTP Range 206 / 100 bytes PASS. Windows/Android சாதனச் சோதனை இன்னும் செய்யப்படவில்லை.


V1.7 புதிய வசதி:
- Album Artwork / Cover Image சேர்த்தல்: JPG அல்லது PNG படத்தை MP3, M4A, MP4 கோப்புகளில் embed செய்யலாம்.
- அதிகபட்ச Cover Image அளவு 8 MB; கோப்பின் MIME மற்றும் உண்மையான signature சரிபார்க்கப்படும்.
- FFmpeg மூலம் புதிய output கோப்பு உருவாக்கப்படும்; அசல் கோப்பு மாற்றப்படாது.
- FFprobe மூலம் output-ல் attached cover image இருப்பது சரிபார்க்கப்படும்.

சோதனை முடிவுகள் (இந்த build சூழலில்): Node.js syntax PASS; UI JavaScript syntax PASS; PNG cover image MP3-ல் embed PASS; FFprobe attached_pic verification PASS. M4A/MP4 artwork மற்றும் Windows/Android சாதனச் சோதனைகள் இன்னும் செய்யப்படவில்லை.


V1.8 புதிய வசதி — Audio / Video Merge:
- Library-யில் உள்ள 2 முதல் 10 Audio-only கோப்புகளை ஒரே MP3-ஆக ஒன்றிணைக்கலாம்.
- Library-யில் உள்ள 2 முதல் 10 Video கோப்புகளை ஒரே MP4-ஆக ஒன்றிணைக்கலாம்.
- FFmpeg மூலம் re-encode செய்து வெளியீடு உருவாக்கப்படும்; அசல் கோப்புகள் மாற்றப்படாது.
- வெளியீட்டில் தேவையான Audio அல்லது Video stream இருப்பதை FFprobe மூலம் சரிபார்க்கிறது.
- Video Merge தற்போது Video stream மட்டும் ஒன்றிணைக்கிறது; உள்ளீட்டு Audio track-கள் வெளியீட்டில் சேர்க்கப்படாது.
- வேறுபட்ட codec, resolution, frame rate அல்லது audio sample format கொண்ட கோப்புகள் சில நேரங்களில் FFmpeg concat filter-க்கு பொருந்தாமல் தோல்வியடையலாம். ஒரே மாதிரியான format/resolution கொண்ட கோப்புகளைப் பயன்படுத்தவும்.

சோதனை முடிவுகள் (இந்த build சூழலில்): Node.js server syntax PASS; UI JavaScript syntax PASS; Audio Merge API PASS (2 WAV → MP3; FFprobe duration சுமார் 2.04 வினாடி); Video Merge API PASS (2 MP4 → MP4; FFprobe duration 2.00 வினாடி); Health endpoint version 1.8.0 PASS. உண்மையான Windows/Android சாதனச் சோதனை இன்னும் செய்யப்படவில்லை.


VERSION 1.9 - AUDIO / SUBTITLE TRACK EXTRACTION
- Media Info-வில் stream index, வகை, codec, மொழி, title காட்டப்படும்.
- Audio Track ஒன்றைத் தேர்ந்தெடுத்து MP3 ஆக தனியாகப் பிரிக்கலாம்.
- Subtitle Track ஒன்றைத் தேர்ந்தெடுத்து SRT ஆக தனியாகப் பிரிக்கலாம்.
- அசல் கோப்பு மாற்றப்படாது; புதிய கோப்பு downloads / Library-ல் சேமிக்கப்படும்.
- Subtitle பிரித்தெடுத்தல் உள்ளீட்டு subtitle codec-ன் FFmpeg ஆதரவைப் பொறுத்தது.
- API: POST /api/extract-track { filename, streamIndex, kind: audio|subtitle }


VERSION 1.15 — STARTUP DIAGNOSTICS & VERSION CONSISTENCY
- package.json, UI header மற்றும் /api/health பதிப்பு எண் 1.15.0 என ஒரே மாதிரியாக்கப்பட்டது.
- doctor.js தொடங்குவதற்கு முன் Node.js >= 22.13.0, FFmpeg, FFprobe, data folder write permission மற்றும் 127.0.0.1:8787 port கிடைப்பதைச் சரிபார்க்கும்.
- start.bat இப்போது தவறான Node.js 18+ அறிவிப்பை நீக்கி, doctor சோதனை வெற்றியடைந்த பிறகே server-ஐத் தொடங்கும்.
- சோதனை: Node.js 22.16.0; FFmpeg/FFprobe கிடைக்கும்; data folder எழுதக்கூடியது; local port check; server/UI syntax.
- இந்த build சூழலில் செய்யப்பட்ட சோதனைகள் மட்டுமே PASS எனக் குறிப்பிடப்படுகின்றன. Windows/Android சாதன நிறுவல் சோதனை இன்னும் செய்யப்படவில்லை.


VERSION 1.16 - WINDOWS DESKTOP BUILD CONFIGURATION
- Electron desktop shell சேர்க்கப்பட்டது; Windows-ல் தனி BrowserWindow-வில் செயலியை இயக்கும்.
- desktop/main.js உள்ளூர் Node backend-ஐ தனி child process-ஆக தொடங்கி /api/health மூலம் readiness சரிபார்க்கும்.
- சாளரம் மூடும்போது backend process நிறுத்தப்படும்.
- npm run desktop மூலம் development desktop shell இயக்கலாம்.
- npm run dist:win மூலம் Windows x64 NSIS installer உருவாக்கலாம் (Windows build host தேவை).
- .github/workflows/build-windows.yml மூலம் GitHub Actions-ல் manual அல்லது v* tag push மூலம் Windows installer build செய்து artifact ஆகப் பெறலாம்.
- Installer-ல் FFmpeg/FFprobe சேர்க்கப்படவில்லை; Windows கணினியில் FFmpeg/FFprobe PATH-ல் நிறுவப்பட்டிருக்க வேண்டும்.
- Electron packaging configuration சேர்க்கப்பட்டது; இந்த source ZIP உருவாக்கும் சூழலில் Windows installer build செய்யப்படவில்லை. GitHub Actions/Windows build முடிவைத் தனியாகச் சரிபார்க்க வேண்டும்.
- Android APK இந்தப் பதிப்பில் இல்லை.


VERSION 1.17 - DESKTOP RUNTIME RELIABILITY
- Electron desktop app இப்போது ஒவ்வொரு இயக்கத்திலும் தனியாகக் கிடைக்கும் localhost port-ஐத் தேர்வு செய்கிறது; ஏற்கெனவே 8787 port பயன்படுத்தப்பட்டாலும் desktop app மோதலைத் தவிர்க்கும்.
- ஒரே நேரத்தில் இரண்டாவது desktop instance திறக்கப்படுவது தடுக்கப்படுகிறது; ஏற்கெனவே திறந்த சாளரம் முன்வருகிறது.
- Desktop தரவுத்தளம் மற்றும் downloads, நிறுவப்பட்ட program folder-ல் அல்லாமல் Windows userData இடத்தில் சேமிக்கப்படும். இதனால் சாதாரண பயனர் அனுமதியுடன் இயங்கவும் uninstall/upgrade போது பயனர் தரவைத் தக்கவைக்கவும் உதவும்.
- Electron package-ல் ASAR இயக்கப்பட்டுள்ளது; runtime writable data தனி userData folder-ல் இருக்கும்.
- GitHub Actions workflow-இல் lockfile இல்லாததால் npm cache setup தோல்வியடையும் சாத்தியம் நீக்கப்பட்டது; source check மற்றும் installer SHA-256 verification சேர்க்கப்பட்டது.
- Health API பதிப்பு 1.17.0 எனப் புதுப்பிக்கப்பட்டது.
- சோதனை: Node.js syntax, desktop main syntax, doctor syntax, package JSON parse மற்றும் workflow YAML அமைப்பு சரிபார்க்கப்பட்டது. Windows installer உண்மையான Windows runner-ல் build செய்து பெறப்படும்வரை உருவானதாகக் கருதக்கூடாது.
- குறிப்பு: Installer இன்னும் FFmpeg/FFprobe-ஐ bundle செய்யவில்லை; Windows-ல் FFmpeg நிறுவி PATH-ல் சேர்க்கப்பட வேண்டும். Android APK இன்னும் இல்லை.

VERSION 1.18 — WINDOWS BRANDING & INSTALLER ICON
- AK Downloader-க்கு தனிப்பயன் பல-அளவு Windows ICO உருவாக்கப்பட்டது.
- Electron desktop window-க்கும் Windows NSIS installer-க்கும் அதே icon பயன்படுத்தப்படும்.
- electron-builder package files பட்டியலில் icon.ico சேர்க்கப்பட்டது.
- package.json மற்றும் Health API பதிப்பு 1.18.0 எனப் புதுப்பிக்கப்பட்டது.
- சோதனை: package JSON parse, ICO multi-size file validation, server/desktop/doctor Node syntax, UI JavaScript syntax, ZIP integrity.
- குறிப்பு: இந்த build சூழலில் Windows EXE உருவாக்கப்படவில்லை; Windows runner-ல் GitHub Actions build முடிவு கிடைத்த பிறகே installer உருவானதாகக் கருதலாம். Android APK இன்னும் இல்லை.



============================================================
V1.19 – FFmpeg / FFprobe BUNDLING UPDATE
============================================================
இந்தப் பதிப்பில் Windows Installer உருவாக்கும்போது FFmpeg மற்றும்
FFprobe-க்கான platform-specific binary packages சேர்க்கப்படும்.
அதனால் Windows Desktop பதிப்பைப் பயன்படுத்த தனியாக FFmpeg PATH
அமைக்க வேண்டிய தேவையை குறைக்கிறது.

குறிப்பு:
- npm install / Windows Build நேரத்தில் இணைய இணைப்பு தேவை.
- electron-builder binary கோப்புகளை ASAR-க்கு வெளியே unpack செய்கிறது.
- Source ZIP-இல் binary கோப்புகள் சேர்க்கப்படவில்லை.
- Browser/PWA மற்றும் Android பதிப்புகளுக்கு இந்த Windows binaries
  தானாகப் பொருந்தாது; Android-க்கு தனி native media engine தேவை.
- இந்தச் சூழலில் Windows Installer உருவாக்கப்படவில்லை. GitHub Actions
  Windows runner-ல் build செய்து artifact-ஐப் பதிவிறக்க வேண்டும்.


============================================================
V1.21 — WINDOWS DESKTOP RUNTIME FIX & PACKAGE VERIFICATION
============================================================
- Electron app.asar என்பது virtual archive என்பதால் அதை child backend-ன் OS working directory-ஆகப் பயன்படுத்த முடியாது. Backend process-ன் cwd இப்போது உண்மையான app.asar.unpacked கோப்புறையாக மாற்றப்பட்டது.
- Backend spawn தோல்வியடைந்தால் unhandled process error ஏற்படாமல், தெளிவான பிழைச் செய்தி காட்டப்படும்.
- Windows GitHub Actions build-இல் installer மட்டும் அல்லாமல் unpacked FFmpeg/FFprobe binary-களும் இருப்பதையும் அவை version command இயக்குவதையும் சரிபார்க்கும்.
- package.json மற்றும் /api/health பதிப்பு 1.21.0.
- இந்த build சூழலில் Node syntax, UI JavaScript syntax, package JSON மற்றும் ZIP integrity சோதனைகள் செய்யப்படும். Windows runner-ல் உருவாகும் EXE மற்றும் bundled binary execution-ஐ GitHub Actions முடிவு PASS ஆன பிறகே உறுதிப்படுத்தலாம்.
- Android APK இன்னும் இல்லை.


VERSION 1.22 — DESKTOP WEB-CONTENT SECURITY
- Electron Desktop சாளரம் தனது 127.0.0.1 உள்ளூர் செயலி முகவரியைத் தவிர வேறு origin-க்கு navigate/redirect ஆக முடியாது.
- புதிய window திறக்க முயன்றால் தடுக்கப்படும்; சரியான HTTPS வெளிப்புற இணைப்புகள் மட்டும் default browser-ல் திறக்கப்படும்.
- Username/password கொண்ட HTTPS URL-கள் வெளிப்புறமாகத் திறக்கப்படாது.
- Camera, microphone, geolocation உள்ளிட்ட browser permissions அனைத்தும் desktop shell-ல் மறுக்கப்படும்; உள்ளூர் media செயல்பாடுகளுக்கு அவை தேவையில்லை.
- இந்த மாற்றங்கள் Electron main process-ல் செய்யப்பட்டவை. Node syntax சோதனை மற்றும் static package checks செய்யப்பட்டன; உண்மையான Windows installer/device test இன்னும் தேவை.


============================================================
V1.23 — RELEASE VERSION CONSISTENCY & MEDIA ENGINE HEALTH CHECK
============================================================
- package.json, /api/health மற்றும் backup JSON ஆகியவற்றின் பதிப்பு எண் 1.23.0 என ஒருங்கிணைக்கப்பட்டது.
- /api/health இப்போது FFmpeg மட்டுமல்லாமல் FFprobe-வும் இயங்குகிறதா எனத் தனித்தனியாகச் சோதித்து ffmpeg, ffprobe நிலைகளைத் தரும்.
- இதனால் Media Info / Track விவரங்கள் போன்ற FFprobe சார்ந்த அம்சங்களுக்கு தேவையான கருவி இல்லை என்றால் தொடக்கத்திலேயே கண்டறிய முடியும்.
- Node syntax, UI JavaScript syntax, package JSON, live health API, backup version மற்றும் ZIP integrity சோதனைகள் செய்யப்பட்டன.
- உண்மையான Windows Installer build மற்றும் Windows/Android சாதனச் சோதனைகள் இன்னும் செய்யப்படவில்லை.


V1.24 — RELEASE REGRESSION TESTS
- test-release.js சேர்க்கப்பட்டது. தனி தற்காலிக தரவு கோப்புறையில் சேவையகத்தைத் தொடங்கி முக்கிய API செயல்பாடுகளைச் சோதிக்கும்.
- Health/version, முகப்பு பக்கம், கோப்பு பட்டியல், HTTP byte-range streaming, தவறான Range நிராகரிப்பு, Backup/Restore, Library மற்றும் CORS ஆகியவை தானியங்கி சோதனையில் அடங்கும்.
- சோதனை: npm run test:release (Node.js 22.13 அல்லது அதற்கு மேல் தேவை).
- npm run check இப்போது test-release.js syntax-ஐயும் சரிபார்க்கும்.


V1.25 — GRACEFUL SHUTDOWN & HTTP RESOURCE LIMITS
- Backend-க்கு SIGINT/SIGTERM வந்தால் இயங்கிக்கொண்டிருக்கும் download பாதுகாப்பாக Pause நிலைக்கு மாற்றப்பட்டு jobs.json-ல் சேமிக்கப்படும்.
- HTTP headers timeout 15 வினாடி, request timeout 120 வினாடி, keep-alive timeout 5 வினாடி என வரையறுக்கப்பட்டது.
- சேவையகம் மூடும்போது HTTP server மற்றும் SQLite database முறையாக close செய்யப்படும்; முடங்கும் சூழலுக்கு 8 வினாடி பாதுகாப்பு timeout உள்ளது.
- Release regression test-இல் suffix byte-range, malformed range மற்றும் Playlist உருவாக்கம்/பாடல் சேர்த்தல் சோதனைகள் சேர்க்கப்பட்டன.
- package.json, Health API மற்றும் Backup metadata பதிப்பு 1.25.0.
- சோதனை முடிவுகள் இந்த build சூழலில் மட்டுமே பொருந்தும்; Windows Installer / Android APK இன்னும் உருவாக்கப்படவில்லை.


VERSION 1.26 — LIBRARY FILE MANAGEMENT
- Library-யில் உள்ள தேவையற்ற கோப்பை 'நீக்கு' பொத்தான் மூலம் நிரந்தரமாக நீக்கலாம்.
- நீக்குவதற்கு முன் உறுதிப்படுத்தல் கேட்கப்படும்.
- கோப்பு நீக்கப்பட்டதும் அதற்கான Playlist references மற்றும் Library metadata row-களும் நீக்கப்படும்.
- Delete API: DELETE /api/library/{filename}
- Regression test-ல் physical file deletion மற்றும் Playlist item cleanup சரிபார்க்கப்படுகிறது.
- எச்சரிக்கை: இந்தச் செயல் நிரந்தரமானது. தேவையான கோப்புகளை முன்கூட்டியே Backup எடுக்கவும்.


V1.27.0 புதுப்பிப்பு:
- Playlist பெயர் மாற்றம், Playlist நீக்கம், Playlist பாடல்கள் பட்டியல் மற்றும் பாடல் நீக்கம் API சேர்க்கப்பட்டது.
- Playlist நீக்கும்போது அசல் மீடியா கோப்புகள் பாதுகாக்கப்படும்.
- UI-யில் Playlist நிர்வாகக் கட்டுப்பாடுகள் சேர்க்கப்பட்டன.
- புதிய Regression Tests சேர்க்கப்பட்டன.


V1.28.0 புதுப்பிப்பு:
- Playlist-ஐ M3U கோப்பாக Export செய்யும் வசதி சேர்க்கப்பட்டது.
- Export செய்யப்பட்ட M3U-வில் Library-யில் இன்னும் இருக்கும் கோப்புகள் மட்டுமே சேர்க்கப்படும்.
- Playlist UI-யில் M3U Export பொத்தான் சேர்க்கப்பட்டது.
- Release regression test-ல் M3U Export API சோதனை சேர்க்கப்பட்டது.


V1.29.0 புதுப்பிப்பு:
- M3U Playlist Import வசதி சேர்க்கப்பட்டது.
- Import செய்யும்போது Downloads கோப்புறையில் ஏற்கனவே உள்ள கோப்புகள் மட்டுமே சேர்க்கப்படும்.
- இணைய URL, இல்லாத கோப்பு, duplicate entries ஆகியவை பாதுகாப்பாக தவிர்க்கப்படும்.
- Import Regression Test சேர்க்கப்பட்டது.


V1.31.0 புதுப்பிப்பு:
- Playlist பாடல் வரிசை நிரந்தரமாகச் சேமிக்கப்படுகிறது.
- Playlist பாடல்களை விருப்பமான வரிசையில் மாற்றும் வசதி சேர்க்கப்பட்டது.
- M3U Import மற்றும் Export இரண்டும் Playlist வரிசையைப் பாதுகாக்கும்.
- பழைய Database-களில் position புலம் தானாகச் சேர்க்கப்படும்; பழைய Playlist தரவு பாதுகாக்கப்படும்.
- Playlist வரிசை மாற்றத்திற்கான Regression Tests சேர்க்கப்பட்டன.


V1.31.0 புதுப்பிப்பு:
- Playlist வரிசை மாற்றும் வசதி prompt-ஐ சாராமல் பட்டியல் UI-யில் மேலே/கீழே பொத்தான்களுடன் மேம்படுத்தப்பட்டது.
- வரிசை மாற்றத்தைச் சேமிக்கும் முன் ரத்து செய்யவும், சேமித்த பிறகு உறுதிப்படுத்தவும் வசதி சேர்க்கப்பட்டது.
- Playlist custom order API மற்றும் M3U Export/Import வரிசை சோதனைகள் தொடர்கின்றன.


v1.32.0 வெளியீட்டு மேம்பாடுகள்:
- செயலியின் முகப்பில் காட்டப்படும் பதிப்பு எண் 1.32 ஆகப் புதுப்பிக்கப்பட்டது.
- GitHub Actions-ல் package-lock.json இல்லாததால் ஏற்படக்கூடிய npm cache setup தோல்வி தவிர்க்கப்பட்டது.
- Windows Installer உருவாக்குவதற்கு முன் release regression test தானாக இயக்கப்படும்.
- Installer உருவான பிறகு SHA256 checksum கோப்பும் Artifact-இல் சேர்க்கப்படும்.
- இது Source ZIP மட்டுமே; Windows EXE மற்றும் Android APK இங்கே உருவாக்கப்படவில்லை.

வெளியீட்டு சோதனை நிலை:
- Source syntax மற்றும் release regression test-கள் GitHub Actions workflow-ல் சேர்க்கப்பட்டுள்ளன.
- இந்தப் பதிப்புக்கான GitHub Actions run இன்னும் இயக்கப்படவில்லை; ஆகவே Windows EXE build வெற்றி என உறுதிப்படுத்தப்படவில்லை.


v1.33.0 வெளியீட்டு மேம்பாடுகள்:
- Server health API மற்றும் Backup JSON ஆகியவற்றில் பதிப்பு எண் package.json-இலிருந்து நேரடியாகப் பெறப்படும்.
- package.json பதிப்பு எண் மாற்றப்பட்டும் API/Backup-ல் பழைய பதிப்பு எண் காட்டப்படும் பிழை நீக்கப்பட்டது.
- Release regression test-ல் 1.33.0 Health மற்றும் Backup version சரிபார்ப்பு புதுப்பிக்கப்பட்டது.
- எதிர்கால வெளியீடுகளில் பதிப்பு எண் ஒரே இடத்தில் நிர்வகிக்கப்படும்.

குறிப்பு:
- இது Source ZIP. இந்தச் சூழலில் Windows EXE உருவாக்கப்படவில்லை.
- GitHub Actions workflow-ஐ இயக்கிய பிறகே Windows Installer build நிலையை உறுதிப்படுத்த முடியும்.
- Android APK இன்னும் உருவாக்கப்படவில்லை.


v1.34.0 வெளியீட்டு மேம்பாடுகள்:
- புதிய Storage Overview: சாதனத்தின் மொத்த/காலி சேமிப்பகம், Library கோப்புகளின் எண்ணிக்கை மற்றும் அளவு, Downloads கோப்புகளின் அளவு.
- /api/storage endpoint சேர்க்கப்பட்டது; UI Library பகுதியில் சேமிப்பக விவரம் தானாகக் காட்டப்படும்.
- Release regression test-ல் Storage API மதிப்புகள் சோதிக்கப்படும்.
- இது Source ZIP மட்டுமே; Windows EXE அல்லது Android APK இங்கு உருவாக்கப்படவில்லை.


V1.35 மேம்பாடுகள் (20-11-2026)
- Download Resume பாதுகாப்பு மேம்படுத்தப்பட்டது: ETag / Last-Modified validator இருந்தால் மட்டுமே பழைய பகுதி கோப்பில் தொடரும்.
- If-Range மற்றும் Content-Range தொடக்க byte சரிபார்ப்பு சேர்க்கப்பட்டது; தவறான byte offset-இல் தரவு இணைக்கப்படாது.
- Source கோப்பு மாறியிருந்தால் அல்லது Range ஆதரவு இல்லாவிட்டால் byte 0-இல் இருந்து பாதுகாப்பாக மீண்டும் தொடங்கும்.
- Release regression test-இல் queue endpoint மற்றும் HTTP URL நிராகரிப்பு சோதனை சேர்க்கப்பட்டது.
- குறிப்பு: உண்மையான வெளிப்புற download server-களில் live pause/resume சோதனை இந்த offline test தொகுப்பில் செய்யப்படவில்லை.


V1.36 மேம்பாடுகள் (20-11-2026)
- Download Queue வரலாற்றை CSV மற்றும் JSON வடிவங்களில் ஏற்றுமதி செய்யலாம்.
- CSV Export spreadsheet பயன்பாடுகளுக்கு ஏற்ற UTF-8 BOM உடன் உருவாக்கப்படுகிறது.
- Export-ல் மூல URL / தனிப்பட்ட இணைப்புகள் சேர்க்கப்படாது.
- CSV Formula Injection அபாயத்தைத் தடுக்க ஆபத்தான தொடக்க எழுத்துகள் பாதுகாக்கப்படுகின்றன.
- பயன்பாட்டு முகப்பில் பதிப்பு எண் V1.36 எனச் சரிசெய்யப்பட்டது.


V1.37 மேம்பாடுகள் (20-11-2026)
- GitHub Actions Windows x64 installer workflow source ZIP-இல் உண்மையாக இணைக்கப்பட்டது.
- workflow_dispatch மூலம் கைமுறையாகவும் v* tag push மூலம் தானாகவும் Windows build தொடங்கும்.
- Build-க்கு முன் syntax மற்றும் release integration tests இயக்கப்படும்.
- electron-builder மூலம் NSIS EXE உருவாக்கப்படும்; EXE இல்லாவிட்டால் workflow தோல்வியடையும்.
- உருவான installer-க்கு SHA-256 checksum உருவாக்கி EXE உடன் Artifact-ஆக வெளியிடப்படும்.
- npm run build:win என்ற ஒரே கட்டளையில் check, release test, Windows packaging இயக்கும் script சேர்க்கப்பட்டது.
- பதிப்பு எண் 1.37.0 ஆக ஒருங்கிணைக்கப்பட்டது.

வெளியீட்டு நிலை:
- இந்த ZIP-இல் Windows build workflow சேர்க்கப்பட்டுள்ளது; GitHub Actions-ல் இயக்கப்பட்டு EXE Artifact கிடைக்கும் வரை EXE உருவானதாகக் கருதக்கூடாது.
- Android APK இன்னும் உருவாக்கப்படவில்லை.

============================================================
V1.39.0 – ANDROID CLIENT SOURCE + APK BUILD WORKFLOW
============================================================

இந்தப் பதிப்பில் android/ என்ற Android Studio / Gradle திட்டம் சேர்க்கப்பட்டுள்ளது.

Android செயலியின் தற்போதைய செயல்பாடு:
- Android WebView மூலம் AK Downloader சேவையக முகவரியைத் திறக்கும்.
- முதல் தொடக்கத்தில் சேவையக URL-ஐ பயனர் அமைக்கலாம்; அது சாதனத்தில் சேமிக்கப்படும்.
- WebView-இல் வரும் நேரடி கோப்பு பதிவிறக்க இணைப்புகளை Android DownloadManager-க்கு அனுப்பும்.
- HTTPS சேவையகம் அல்லது ஒரே Wi-Fi வலையமைப்பில் உள்ள கணினியின் LAN முகவரியைப் பயன்படுத்தலாம்.
- GitHub Actions-இல் Build Android APK workflow இயக்கி Debug APK Artifact பெறலாம்.

முக்கிய வரம்புகள்:
- இது முழுமையான Offline Native Android backend அல்ல.
- Android செயலி இயங்க AK Downloader Node.js சேவையகம் வேறு கணினி/சேவையகத்தில் இயங்க வேண்டும்.
- சேவையக URL அமைக்கப்படாவிட்டால் செயலி முதலில் வழிகாட்டும் திரையைக் காட்டும்.
- இந்த வெளியீட்டில் APK-ஐ இச்சூழலில் உருவாக்கி சாதனத்தில் நிறுவிச் சோதிக்கவில்லை.
- Android FFmpeg native integration, background job persistence, Play Store signing இன்னும் செய்யப்படவில்லை.
- Debug APK-ஐ வெளியிடுவதற்கு முன் உண்மையான Android சாதனத்தில் சோதிக்க வேண்டும்.

APK உருவாக்கம்:
1. இந்த Source ZIP-ஐ GitHub repository-க்கு push செய்யவும்.
2. Actions பகுதியில் “Build Android APK” workflow தேர்வு செய்யவும்.
3. Run workflow அழுத்தவும்.
4. வெற்றியடைந்ததும் AK-MUSIC-VIDEO-DOWNLOADER-Android-APK Artifact-ஐப் பதிவிறக்கவும்.

பதிப்பு: 1.39.0

============================================================
V1.40.0 – ANDROID DOWNLOAD + WEBVIEW SECURITY IMPROVEMENTS
============================================================

Android செயலியில் செய்யப்பட்ட மேம்பாடுகள்:
- WebView-இல் Mixed Content (HTTPS பக்கத்தில் பாதுகாப்பற்ற HTTP உள்ளடக்கம்) தடுக்கப்படுகிறது.
- Android Safe Browsing இயக்கப்பட்டுள்ளது.
- Local file access மற்றும் third-party cookies முடக்கப்பட்டுள்ளன.
- சேவையக முகவரி HTTPS ஆக இருக்க வேண்டும்; HTTP பயன்படுத்தினால் localhost அல்லது தனிப்பட்ட LAN IPv4 முகவரியாக இருக்க வேண்டும்.
- WebView-இல் சேவையகத்தின் அதே origin இணைப்புகள் மட்டுமே செயலிக்குள் திறக்கும்; பிற இணைய இணைப்புகள் வெளிப்புற Browser-ல் திறக்கும்.
- பதிவிறக்கத்திற்கு முன் HTTPS / தனிப்பட்ட LAN HTTP சரிபார்க்கப்படுகிறது.
- Content-Disposition மற்றும் MIME தகவலிலிருந்து கோப்புப் பெயர் கண்டறியப்படுகிறது; பாதுகாப்பற்ற filename எழுத்துகள் மாற்றப்பட்டு timestamp prefix சேர்க்கப்படுகிறது.
- Android Download Manager-ல் பதிவிறக்க அறிவிப்பு, Metered network கட்டுப்பாடு மற்றும் Roaming-ஐத் தவிர்க்கும் அமைப்பு சேர்க்கப்பட்டுள்ளது.
- மேல்பட்டியில் Android Downloads பட்டியலைத் திறக்கும் குறுக்கு வழி சேர்க்கப்பட்டுள்ளது.
- Android versionCode 140 / versionName 1.40.0.

சோதனை வரம்பு:
- Release regression test-இல் Android source/configuration smoke checks சேர்க்கப்பட்டுள்ளன.
- இந்த build சூழலில் Android SDK / Gradle நிறுவப்படாததால் APK compile, emulator மற்றும் physical-device சோதனைகள் செய்யப்படவில்லை.
- HTTP தனிப்பட்ட LAN ஆதரவு Android cleartext policy-யை பயன்படுத்துகிறது; அதனால் பயனர் உள்ளிட்ட URL-களில் மட்டுமே private-host validation கட்டாயப்படுத்தப்படுகிறது.
- இது இன்னும் Node.js சேவையகத்தை சார்ந்த Android client; standalone offline native downloader அல்ல.

பதிப்பு: 1.40.0


============================================================
V1.41.0 – ANDROID FILE PICKER + WEBVIEW USABILITY
============================================================

Android செயலியில் செய்யப்பட்ட மேம்பாடுகள்:
- WebView file input மூலம் மொபைலில் உள்ள கோப்புகளைத் தேர்ந்தெடுத்து இணைய செயலிக்கு வழங்கும் Native File Picker சேர்க்கப்பட்டது.
- பல கோப்புகளைத் தேர்வு செய்தால் WebView-க்கு தேர்வு முடிவுகள் வழங்கப்படும்.
- பக்க ஏற்ற முன்னேற்றத்தைக் காட்டும் Progress Bar சேர்க்கப்பட்டது.
- மேல்பட்டியில் பக்கத்தை மீண்டும் ஏற்றும் Refresh வசதி சேர்க்கப்பட்டது.
- Activity முடிவடையும் போது திறந்த கோப்பு தேர்வு callback மற்றும் WebView பாதுகாப்பாக முடிக்கப்படும்.
- Android versionCode 141 / versionName 1.41.0.

சோதனை வரம்பு:
- Android source/configuration smoke checks மற்றும் release integration tests இந்த build சூழலில் இயக்கப்பட வேண்டும்.
- Android SDK / Gradle இங்கு நிறுவப்படாததால் APK compile, emulator மற்றும் உண்மையான சாதனச் சோதனை செய்யப்படவில்லை.
- File Picker ஆதரவு WebView file input பயன்படுத்தும் பக்கங்களுக்கு மட்டுமே செயல்படும்.
- இது இன்னும் Node.js சேவையகத்தை சார்ந்த Android client.

பதிப்பு: 1.41.0


============================================================
V1.42.0 – ANDROID DOWNLOAD NOTIFICATION PERMISSION
============================================================

Android செயலியில் செய்யப்பட்ட மேம்பாடுகள்:
- Android 13 மற்றும் அதற்கு மேற்பட்ட பதிப்புகளில் DownloadManager அறிவிப்புகளுக்கான POST_NOTIFICATIONS அனுமதி, முதல் பதிவிறக்க முயற்சியின் போது மட்டும் கோரப்படும்.
- பயனர் அறிவிப்பு அனுமதியை மறுத்தாலும் பதிவிறக்கம் தடுக்கப்படாது; Downloads பகுதியில் நிலையைப் பார்க்கலாம் என்று தமிழில் விளக்கம் வழங்கப்படும்.
- Android 12 மற்றும் அதற்கு முந்தைய பதிப்புகளில் runtime permission கோரப்படாது.
- சேவையக URL உள்ளீட்டிற்கு URI keyboard வகை சரிசெய்யப்பட்டது.
- Android versionCode 142 / versionName 1.42.0; package/API version ஒருங்கிணைக்கப்பட்டது.

சோதனை வரம்பு:
- Android source/configuration smoke checks மற்றும் Node.js release integration tests இயக்கப்பட வேண்டும்.
- இந்தச் சூழலில் Android SDK / Gradle இல்லை; எனவே APK compile, emulator மற்றும் சாதனச் சோதனை செய்யப்படவில்லை.
- அறிவிப்பு அனுமதி மறுக்கப்பட்டாலும் DownloadManager பதிவிறக்கம் இயங்கும்; system notification மட்டும் காட்டப்படாமல் இருக்கலாம்.

பதிப்பு: 1.42.0


============================================================
V1.43 - Android Native App அடிப்படை நிறைவு
============================================================
- AndroidManifest.xml மற்றும் MainActivity.java சேர்க்கப்பட்டது.
- முதல் முறை திறக்கும்போது HTTPS சேவையக முகவரியை கேட்டு பாதுகாப்பாக சேமிக்கும்.
- WebView மூலம் சேவையக UI-ஐத் திறக்கும்; JavaScript மற்றும் DOM storage இயக்கப்படும்.
- Android DownloadManager மூலம் HTTPS கோப்புகளை Downloads/AK Downloader கோப்புறையில் சேமிக்கும்.
- WebView file chooser, back navigation, page loading progress சேர்க்கப்பட்டது.
- Android 13+ அறிவிப்பு அனுமதி கோரப்படும்.
- பாதுகாப்புக்காக வெளிப்புற HTTP இணைப்புகள் மறுக்கப்படும்.
- Android build இங்கு உண்மையான SDK மூலம் இயக்கப்படவில்லை; GitHub Actions-ல் APK build செய்து சோதிக்க வேண்டும்.
- Android பயன்பாட்டிற்கு அணுகக்கூடிய HTTPS backend தேவை. இந்த APK-யில் Node.js backend உட்பொதிக்கப்படவில்லை.


============================================================
V1.43.0 - ANDROID NATIVE WEBVIEW APP + DOWNLOAD MANAGER
============================================================
- முழுமையான AndroidManifest.xml மற்றும் Java MainActivity சேர்க்கப்பட்டது.
- முதல் தொடக்கத்தில் HTTPS backend URL கேட்டு SharedPreferences-ல் சேமிக்கிறது; Server பொத்தானில் மாற்றலாம்.
- WebView-க்கு JavaScript/DOM storage, Safe Browsing, mixed-content block, file chooser, back navigation, loading progress.
- Refresh, Downloads, Server ஆகிய Native toolbar கட்டுப்பாடுகள் சேர்க்கப்பட்டன.
- HTTPS download-கள் Android DownloadManager மூலம் Downloads/AK Downloader-ல் சேமிக்கப்படும்.
- Android 13+ notification permission கோரப்படுகிறது; மறுத்தாலும் DownloadManager வேலை தொடரும்.
- Android cleartext HTTP முழுமையாக முடக்கப்பட்டுள்ளது. செல்லுபடியாகும் HTTPS backend அவசியம்.
- Android SDK இந்த உருவாக்கச் சூழலில் இல்லை; APK உருவாக்கம் GitHub Actions workflow மூலம் செய்யப்பட வேண்டும்.
- GitHub Actions-ல் Node.js 22 source regression test-க்கு, JDK 17 மற்றும் Gradle 8.9 Android APK build-க்கு பயன்படுத்தப்படும்.


============================================================
V1.44 - Android Build திருத்தம்
============================================================
- Android MainActivity-இல் duplicate local variable பெயர் திருத்தப்பட்டது.
- GitHub Actions Android workflow-இல் தவறான escaped newline உரைகள் நீக்கப்பட்டன.
- Build-க்கு முன் Node source checks மற்றும் release integration test இயக்கப்படும்.
- APK உருவான பிறகு கோப்பு இருப்பு மற்றும் SHA-256 checksum சரிபார்க்கப்படும்.
- Android versionCode 144 / versionName 1.44.0.
- இந்தச் சூழலில் Android SDK/Gradle build இயக்கப்படவில்லை; GitHub Actions build இன்னும் இயக்கப்பட வேண்டும்.


============================================================
V1.45 - Android பாதுகாப்பு மற்றும் கோப்பு தேர்வு நிலைத்தன்மை
============================================================
- Android பதிவிறக்க URL-இல் HTTPS, host மற்றும் embedded credentials சரிபார்க்கப்படும்.
- பதிவிறக்க கோப்பு பெயரில் பாதை பிரிப்பான்/control எழுத்துகள் நீக்கப்படும்; MIME வகை கிடைத்தால் DownloadManager-க்கு வழங்கப்படும்.
- File chooser திறக்க முடியாதபோது அல்லது முடிவைப் படிக்க முடியாதபோது WebView callback பாதுகாப்பாக முடிக்கப்படும்.
- Android GitHub Actions build clean assembleDebug இயக்கி APK SHA-256 checksum-ஐ மீண்டும் சரிபார்க்கும்.
- package version 1.45.0 / Android versionCode 145.
- இந்தச் சூழலில் Android SDK/Gradle இல்லை; உண்மையான APK compile இன்னும் GitHub Actions-ல் இயக்கப்பட வேண்டும்.


============================================================
V1.46 — ANDROID APK CI BUILD AUTOMATION
============================================================
- Android APK workflow இப்போது main/master branch-க்கு push, pull request, v* tag மற்றும் manual Run workflow மூலம் இயங்கும்.
- GitHub Actions-ல் JDK 17 + Gradle 8.9 மூலம் clean assembleDebug build செய்யப்படும்.
- APK உருவானால் SHA-256 checksum சரிபார்த்து version 1.46 artifact ஆக வெளியிடப்படும்.
- package.json, Android versionCode மற்றும் versionName 1.46.0 / 146 என ஒத்திசைக்கப்பட்டன.

APK பெறும் முறை:
1. ZIP-ஐ extract செய்து முழு project-ஐ உங்கள் GitHub repository-யில் main branch-க்கு upload செய்யவும்.
2. GitHub repository-யின் Actions பகுதியில் Build Android APK workflow-ஐத் திறக்கவும்.
3. Workflow தானாக ஓடவில்லை என்றால் Run workflow அழுத்தவும்.
4. பச்சை நிற Success வந்த பிறகு அந்த run-ஐத் திறந்து Artifacts பகுதியில் AK-MUSIC-VIDEO-DOWNLOADER-Android-APK-V1.46-ஐப் பதிவிறக்கவும்.
5. ZIP-ஐ extract செய்து app-debug.apk-ஐ Android சாதனத்தில் நிறுவவும்.

முக்கிய வரம்பு: APK ஒரு WebView client மட்டுமே; Node.js + SQLite + FFmpeg backend இதில் சேர்க்கப்படவில்லை. முதலில் backend-ஐ Windows/Linux கணினி அல்லது HTTPS hosting-ல் இயக்கி, APK-யில் அதன் HTTPS முகவரியை உள்ளிட வேண்டும். இந்த source build-இல் Android SDK இல்லை; உண்மையான APK இன்னும் உருவாக்கப்படவோ சாதனத்தில் சோதிக்கப்படவோ இல்லை.


============================================================
V1.47 — DOWNLOAD QUEUE DESTINATION VALIDATION
============================================================
- Download queue-யில் HTTPS URL மட்டும் ஏற்கப்படுவதுடன், private/local IP, localhost மற்றும் embedded username/password உள்ள URL-களும் job ஏற்கும் முன்பே நிராகரிக்கப்படும்.
- Download worker இணைக்கும் நேரத்திலும் DNS/IP மீண்டும் சரிபார்க்கப்படும்; இதனால் DNS மாற்றம் மூலம் உள்ளக முகவரியை அணுகும் அபாயம் குறைக்கப்படுகிறது.
- Release integration tests-இல் localhost, loopback IP, private LAN IP மற்றும் credential URL மறுப்பு சோதனைகள் சேர்க்கப்பட்டன.
- package version 1.47.0 / Android versionCode 147.
- APK/EXE உருவாக்கம் இன்னும் GitHub Actions-ல் இயக்கப்பட வேண்டும்; இங்கு Android SDK/Windows build இல்லை.


============================================================
V1.48 — IPv6 PRIVATE DESTINATION SECURITY TESTS
============================================================
- Download queue URL பாதுகாப்புச் சோதனைகளில் IPv6 loopback (::1), Unique Local (fc00::/7), link-local (fe80::/10), IPv4-mapped IPv6 முகவரிகள் சேர்க்கப்பட்டன.
- இம்முகவரிகள் HTTPS URL ஆக இருந்தாலும் private/local destination என நிராகரிக்கப்படுவதை integration test உறுதிப்படுத்துகிறது.
- package version 1.48.0 / Android versionCode 148.
- Source tests மட்டும் இங்கு இயக்கப்பட்டன; Android APK மற்றும் Windows EXE உருவாக்கம் தனியாக CI/build சூழலில் செய்யப்பட வேண்டும்.


============================================================
V1.49 — HTTP SECURITY RESPONSE HEADERS
============================================================
- அனைத்து HTTP பதில்களிலும் X-Content-Type-Options: nosniff தொடர்ச்சியாக வழங்கப்படுகிறது.
- X-Frame-Options: DENY மூலம் மற்ற தளங்களில் iframe ஆக திறப்பது தடுக்கப்படுகிறது.
- Referrer-Policy: no-referrer மூலம் வெளிப்புற கோரிக்கைகளுக்கு பக்க URL தகவல் அனுப்பப்படாது.
- Camera, microphone, geolocation அனுமதிகள் தேவையில்லாததால் Permissions-Policy மூலம் முடக்கப்பட்டன.
- Release integration tests இப்போது இந்த பாதுகாப்பு headers-ஐ நேரடியாகச் சரிபார்க்கின்றன.
- package version 1.49.0 / Android versionCode 149.
- Source integration tests மட்டும் இயக்கப்பட்டன; Android APK மற்றும் Windows EXE இன்னும் CI/build சூழலில் உருவாக்கப்பட வேண்டும்.


V1.50 — DOWNLOAD INTEGRITY & INTERRUPTED RESPONSE HANDLING
- HTTP response பாதியில் துண்டிக்கப்பட்டால் Download completed என தவறாகக் குறிக்காது.
- Response முழுமையாக வந்ததா என்பதை Node.js response.complete மூலம் சரிபார்க்கிறது.
- Content-Length இருந்தால் உண்மையில் பெற்ற byte எண்ணிக்கையுடன் ஒப்பிடுகிறது.
- பிழை ஏற்பட்டால் partial file பாதுகாக்கப்பட்டு மீண்டும் Resume செய்யும் வாய்ப்பு வைக்கப்படுகிறது.
- package version 1.50.0 / Android versionCode 150.
- Release regression tests: interrupted response, incomplete response, content-length checks.


V1.51 — PARTIAL DOWNLOAD RESUME ACCURACY
- Interrupted/failed download நேரத்தில் write stream முழுமையாக close ஆன பிறகே disk file size மீண்டும் கணக்கிடப்படுகிறது.
- UI/database progress value உண்மையில் சேமிக்கப்பட்ட bytes-ஐ ஒத்திருக்கச் செய்கிறது.
- அடுத்த Resume request தவறான byte offset-இல் தொடங்குவதைத் தடுக்கிறது.
- package version 1.51.0 / Android versionCode 151.


V1.52 — WINDOWS BUILD AUTOMATION
- Windows Installer workflow இப்போது main/master branch push மற்றும் pull request-களிலும் இயங்கும்.
- GitHub Actions-ல் கைமுறையாகவும் இயக்கலாம்; v* release tag-களிலும் build செய்யலாம்.
- Installer உருவானதா, SHA-256 checksum சரியா, artifact upload ஆனதா என workflow சரிபார்க்கும்.
- Artifact பெயர் V1.52 என version அடையாளத்துடன் வழங்கப்படும்.
- package version 1.52.0 / Android versionCode 152.


V1.53 — ANDROID WEBVIEW NAVIGATION SAFETY
- Android செயலியில் உள்ளே திறக்க அனுமதி: அமைக்கப்பட்ட AK server origin மட்டும்.
- பிற HTTPS தளங்கள் Android system browser-ல் திறக்கப்படும்.
- HTTPS அல்லாத வெளிப்புற navigation தடுக்கப்படும்.
- Android மற்றும் Windows workflow artifact பெயர்கள் V1.53 என ஒத்திசைக்கப்பட்டன.
- package version 1.53.0 / Android versionCode 153.


வெளியீடு 1.54.0 – Android இணைப்பு நம்பகத்தன்மை மற்றும் பாதுகாப்பு மேம்பாடுகள்
- சேவையக URL-இல் HTTPS, host, port மற்றும் தேவையற்ற query/fragment விவரங்கள் சரிபார்க்கப்படுகின்றன.
- HTTPS சான்றிதழ் பிழை ஏற்பட்டால் பாதுகாப்பற்ற முறையில் தொடராமல் இணைப்பு நிறுத்தப்படுகிறது.
- முதன்மைப் பக்க network/HTTP பிழைகளுக்கு தமிழில் தெளிவான அறிவிப்பு காட்டப்படும்.
- Android மற்றும் Windows build artifact பெயர்கள் V1.54 என ஒரே பதிப்புக்கு ஒத்திசைக்கப்பட்டன.


AK MUSIC & VIDEO DOWNLOADER – V1.56 (20-11-2026)
- Android WebView-இல் முன்பு இருந்த HTTP loopback விதிவிலக்கு நீக்கப்பட்டது; இப்போது கட்டமைக்கப்பட்ட HTTPS சேவையக origin மட்டுமே செயலிக்குள் திறக்கும்.
- சேவையக HTTPS URL parsing-க்கு கூடுதல் defensive validation சேர்க்கப்பட்டது; malformed authority/port போன்ற உள்ளீடுகள் நிராகரிக்கப்படும்.
- Android CI build-இல் APK package name, versionCode, versionName ஆகியவை build செய்யப்பட்ட APK-இலிருந்தே சரிபார்க்கப்படும்.
- Android/Windows build artifact பெயர்கள் V1.56 என ஒத்திசைக்கப்பட்டன.


AK MUSIC & VIDEO DOWNLOADER – V1.56 (20-11-2026)
- முகப்புத் திரையில் காட்டப்படும் பதிப்பு எண் 1.56 என ஒத்திசைக்கப்பட்டது.
- Android versionCode/versionName மற்றும் APK/Windows build artifact பெயர்கள் V1.56 ஆக புதுப்பிக்கப்பட்டன.
- Release test-ல் முகப்புப் பதிப்பு மற்றும் package.json பதிப்பு பொருந்துகிறதா எனச் சோதனை சேர்க்கப்பட்டது.
