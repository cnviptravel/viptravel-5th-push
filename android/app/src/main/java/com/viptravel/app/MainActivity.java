package com.viptravel.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import android.Manifest;
import android.widget.Toast;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final String[] REQUIRED_PERMISSIONS = {
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Runtime permission шалгах, хүсэх
        checkAndRequestPermissions();
        
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
                    // Android OS permission шалгах
                    boolean hasAudioPermission = ContextCompat.checkSelfPermission(MainActivity.this, 
                        Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                    boolean hasCameraPermission = ContextCompat.checkSelfPermission(MainActivity.this, 
                        Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                    
                    // WebView permission-ийг зөвхөн Android permission байгаа үед grant хийх
                    if (hasAudioPermission && hasCameraPermission) {
                        request.grant(request.getResources());
                    } else {
                        // Permission байхгүй бол хэрэглэгчээс хүсэх
                        request.deny();
                        Toast.makeText(MainActivity.this, 
                            "Микрофон эсвэл камерын зөвшөөрөл шаардлагатай. Тохиргооноос зөвшөөрнө үү.", 
                            Toast.LENGTH_LONG).show();
                    }
                }
            });
        });
    }
    
    // Permission шалгах, хүсэх функц
    private void checkAndRequestPermissions() {
        List<String> permissionsToRequest = new ArrayList<>();
        
        for (String permission : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(permission);
            }
        }
        
        if (!permissionsToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(this, 
                permissionsToRequest.toArray(new String[0]), 
                PERMISSION_REQUEST_CODE);
        }
    }
    
    // Permission хүсэлтийн үр дүнг боловсруулах
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            
            if (!allGranted) {
                // Зарим permission-г зөвшөөрөөгүй бол сануулга харуулах
                Toast.makeText(this, 
                    "Зарим зөвшөөрөл өгөөгүй байна. Зарим функц ажиллахгүй байж болно. Тохиргооноос зөвшөөрнө үү.", 
                    Toast.LENGTH_LONG).show();
            }
        }
    }
}
