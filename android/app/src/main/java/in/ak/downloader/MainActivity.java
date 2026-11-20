package in.ak.downloader;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.OpenableColumns;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.widget.LinearLayout;
import android.widget.Button;

import java.util.Locale;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 7101;
    private static final int NOTIFICATION_REQUEST = 7102;
    private static final String PREFS = "ak_downloader";
    private static final String SERVER_KEY = "server_url";
    private WebView webView;
    private ProgressBar progress;
    private ValueCallback<Uri[]> fileCallback;
    private SharedPreferences preferences;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        preferences = getSharedPreferences(PREFS, MODE_PRIVATE);
        getWindow().setStatusBarColor(0xFF101827);
        getWindow().setNavigationBarColor(0xFF101827);
        buildScreen();
        requestNotificationPermissionIfNeeded();
        String saved = preferences.getString(SERVER_KEY, "");
        if (saved.isEmpty()) showServerDialog(null);
        else loadServer(saved);
    }

    private void buildScreen() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        Button refresh = new Button(this);
        refresh.setText("Refresh");
        refresh.setOnClickListener(v -> { if (webView != null) webView.reload(); });
        Button downloads = new Button(this);
        downloads.setText("Downloads");
        downloads.setOnClickListener(v -> {
            try { startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS)); }
            catch (ActivityNotFoundException ex) { Toast.makeText(this, "Downloads பட்டியல் கிடைக்கவில்லை", Toast.LENGTH_SHORT).show(); }
        });
        Button serverButton = new Button(this);
        serverButton.setText("Server");
        serverButton.setOnClickListener(v -> showServerDialog("சேவையக HTTPS முகவரியை மாற்றவும்."));
        toolbar.addView(refresh, new LinearLayout.LayoutParams(0, -2, 1));
        toolbar.addView(downloads, new LinearLayout.LayoutParams(0, -2, 1));
        toolbar.addView(serverButton, new LinearLayout.LayoutParams(0, -2, 1));
        webView = new WebView(this);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        layout.addView(toolbar, new LinearLayout.LayoutParams(-1, -2));
        layout.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));
        layout.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(layout);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        CookieManager.getInstance().setAcceptCookie(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, "சேவையகத்தை அணுக முடியவில்லை. இணைய இணைப்பையும் HTTPS முகவரியையும் சரிபார்க்கவும்.", Toast.LENGTH_LONG).show();
                }
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse response) {
                super.onReceivedHttpError(view, request, response);
                if (request != null && request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, "சேவையகப் பிழை: HTTP " + response.getStatusCode(), Toast.LENGTH_LONG).show();
                }
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                Toast.makeText(MainActivity.this, "HTTPS சான்றிதழ் சரிபார்ப்பு தோல்வி. பாதுகாப்புக்காக இணைப்பு நிறுத்தப்பட்டது.", Toast.LENGTH_LONG).show();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
                if ("https".equals(scheme) && isConfiguredServer(uri)) return false;
                if ("https".equals(scheme) && uri.getUserInfo() == null) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (ActivityNotFoundException ex) {
                        Toast.makeText(MainActivity.this, "இணைப்பைத் திறக்க Browser கிடைக்கவில்லை", Toast.LENGTH_LONG).show();
                    }
                    return true;
                }
                Toast.makeText(MainActivity.this, "பாதுகாப்புக்காக அனுமதிக்கப்படாத இணைப்பு தடுக்கப்பட்டது", Toast.LENGTH_LONG).show();
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value >= 100 ? View.GONE : View.VISIBLE);
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    if (params == null) throw new IllegalArgumentException("File chooser parameters unavailable");
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException | IllegalArgumentException ex) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "கோப்புத் தேர்வி கிடைக்கவில்லை", Toast.LENGTH_SHORT).show();
                    return true;
                }
            }
        });
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> enqueueDownload(url, userAgent, contentDisposition, mimeType));
    }

    private boolean isConfiguredServer(Uri candidate) {
        String configured = preferences.getString(SERVER_KEY, "");
        if (configured == null || configured.isEmpty()) return false;
        Uri server = Uri.parse(configured);
        String candidateHost = candidate.getHost();
        String serverHost = server.getHost();
        return candidateHost != null && serverHost != null
            && candidateHost.equalsIgnoreCase(serverHost)
            && candidate.getPort() == server.getPort();
    }

    private void loadServer(String value) {
        String normalized = value.trim();
        if (!normalized.matches("(?i)^https://[^\\s]+$") || normalized.contains("\\")) {
            showServerDialog("HTTPS முகவரியை உள்ளிடவும். உதாரணம்: https://example.com");
            return;
        }
        final Uri uri;
        try {
            uri = Uri.parse(normalized);
            int port = uri.getPort();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !uri.isHierarchical()
                    || uri.getHost() == null || uri.getHost().trim().isEmpty()
                    || uri.getUserInfo() != null || port == 0 || port > 65535
                    || uri.getQuery() != null || uri.getFragment() != null
                    || uri.getEncodedAuthority() == null || uri.getEncodedAuthority().isEmpty()) {
                throw new IllegalArgumentException("Invalid HTTPS server URL");
            }
        } catch (RuntimeException ex) {
            showServerDialog("சரியான HTTPS சேவையக முகவரியை உள்ளிடவும். பயனர்பெயர்/கடவுச்சொல், query அல்லது fragment சேர்க்க வேண்டாம்.");
            return;
        }
        String safeUrl = uri.toString().replaceAll("/+$", "");
        if (safeUrl.isEmpty()) {
            showServerDialog("சரியான HTTPS சேவையக முகவரியை உள்ளிடவும்.");
            return;
        }
        preferences.edit().putString(SERVER_KEY, safeUrl).apply();
        webView.loadUrl(safeUrl);
    }

    private void showServerDialog(String message) {
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint("https://your-server.example");
        input.setText(preferences.getString(SERVER_KEY, ""));
        new AlertDialog.Builder(this)
            .setTitle("AK Downloader சேவையக இணைப்பு")
            .setMessage(message == null ? "உங்கள் AK Downloader சேவையகத்தின் HTTPS முகவரியை உள்ளிடவும்." : message)
            .setView(input)
            .setCancelable(false)
            .setPositiveButton("சேமித்து இணைக்கவும்", (dialog, which) -> loadServer(input.getText().toString()))
            .setNegativeButton("முகவரியை மாற்ற பின்னர்", (dialog, which) -> finish())
            .show();
    }

    private void enqueueDownload(String url, String userAgent, String disposition, String mimeType) {
        try {
            Uri uri = Uri.parse(url);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) {
                Toast.makeText(this, "சரியான HTTPS பதிவிறக்க இணைப்பை வழங்கவும்", Toast.LENGTH_LONG).show();
                return;
            }
            String name = URLUtil.guessFileName(url, disposition, mimeType);
            if (name == null || name.trim().isEmpty()) name = "AK-Download";
            name = name.replaceAll("[/\\\\\\p{Cntrl}]", "_");
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle(name);
            if (mimeType != null && !mimeType.trim().isEmpty()) request.setMimeType(mimeType);
            request.setDescription("AK MUSIC & VIDEO DOWNLOADER");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "AK Downloader/" + name);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(false);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null && !cookie.isEmpty()) request.addRequestHeader("Cookie", cookie);
            if (userAgent != null && !userAgent.isEmpty()) request.addRequestHeader("User-Agent", userAgent);
            DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            manager.enqueue(request);
            Toast.makeText(this, "பதிவிறக்கம் தொடங்கப்பட்டது: " + name, Toast.LENGTH_LONG).show();
        } catch (Exception ex) {
            Toast.makeText(this, "பதிவிறக்கத்தைத் தொடங்க முடியவில்லை: " + ex.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_REQUEST);
        }
    }


    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_REQUEST && grantResults.length > 0 &&
                grantResults[0] != PackageManager.PERMISSION_GRANTED) {
            Toast.makeText(this, "அறிவிப்பு அனுமதி இல்லை; பதிவிறக்கங்கள் Downloads பகுதியில் இருக்கும்", Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileCallback != null) {
            ValueCallback<Uri[]> callback = fileCallback;
            fileCallback = null;
            Uri[] results = null;
            try {
                results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            } catch (RuntimeException ex) {
                Toast.makeText(this, "தேர்ந்தெடுத்த கோப்பைப் படிக்க முடியவில்லை", Toast.LENGTH_SHORT).show();
            }
            callback.onReceiveValue(results);
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (webView != null) { webView.stopLoading(); webView.destroy(); webView = null; }
        super.onDestroy();
    }

    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density + 0.5f); }
}
