package com.viptravel.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // WebView тохиргоог идэвхжүүлэх
        this.bridge.getWebView().post(() -> {
            WebView webView = this.bridge.getWebView();
            WebSettings webSettings = webView.getSettings();
            
            // JavaScript идэвхжүүлэх
            webSettings.setJavaScriptEnabled(true);
            webSettings.setDomStorageEnabled(true);
            webSettings.setDatabaseEnabled(true);
            webSettings.setMediaPlaybackRequiresUserGesture(false);
            
            // WebRTC болон microphone зөвшөөрөл
            webSettings.setAllowFileAccess(true);
            webSettings.setAllowContentAccess(true);
            
            // WebChromeClient тохируулах (microphone зөвшөөрлийн хувьд)
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    // Хүссэн бүх resource-г нэгэн зэрэг grant хийх
                    // тусд нь grant хийх нь зарим Android хувилбарт ажиллахгүй
                    request.grant(request.getResources());
                }
            });
        });
    }
}
