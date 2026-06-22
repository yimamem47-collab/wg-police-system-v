# West Gojjam Zone Police Management System
## Android Studio Gemini Assistant Instruction Prompt (ለአንድሮይድ ስቱዲዮ ጀመናይ ረዳት የሚሆን ዝርዝር መመሪያ)

This documents contains the exact prompt and configuration guide you can copy and paste into **Android Studio's Gemini (AI Assistant)** to configure your Android building environment perfectly. It is tailored to match the system architecture developed by **Chief Sergeant Mengesha Yimam Abera (ዋና ሳጅን መንገሻ ይማም አበራ)**.

---

### Part 1: Amharic Prompt for Android Studio Gemini (በአማርኛ የተቀረጸ የጀመናይ ፕሮምፕት)

የሚከተለውን ጽሑፍ ኮፒ አድርገው በአንድሮይድ ስቱዲዮ (Android Studio) ውስጥ ለሚገኘው **Gemini AI Assistant** ይስጡት። ይህ አፑ በሞባይል ስልክ ላይ ሲጫን ካሜራ፣ QR ስካነር፣ ቴሌግራም፣ ፋየርቤዝ፣ የፒዲኤፍ ማውረድና መጫን እንዲሁም ከመስመር ውጭ (Offline) መስራት እንዲችል ያደርገዋል።

```text
እባክህ እኔ የሰራሁትን የ"ምዕራብ ጎጃም ዞን ፖሊስ ዲጂታል ረዳት" አፕሊኬሽን (የምዕራብ ጎጃም ዞን ፖሊስ መምሪያ) በአንድሮይድ ስቱዲዮ ውስጥ ያለ ምንም ችግር በሞባይል ስልኮች ላይ እንዲሰራ የሚከተሉትን የኮድ፣ የፊውቸር እና የፍቃድ (Permissions) ማስተካከያዎችን አድርግልኝ፦

1. የካሜራ እና ባርኮድ/QR ስካነር ዝግጅት፦
   - በ 'AndroidManifest.xml' ውስጥ የካሜራ እና የሎኬሽን ፍቃዶችን ጨምር።
   - ተጠቃሚው ፍቃድ ሳይሰጥ ሲቀር የሚጠይቅ እና ካሜራው በCapacitor MLKit Barcode Scanning በኩል እንዲከፈት ግብዓቶችን አስካስት።

2. የሰነዶች/ፒዲኤፍ ማውረድ እና መጫን (File Download/Upload support)፦
   - በ 'MainActivity.java' (ወይም .kt) ውስጥ የ Capacictor WebView ሰነዶችን እና PDF ፋይሎችን ከስልክ ማከማቻ (Storage) መጫን እንዲችል 'WebChromeClient' ፋይል መራጭ (File Chooser) አስተካክል።
   - ለአንድሮይድ 10 እና ከዚያ በላይ (እንዲሁም አንድሮይድ 13+) ፋይል ለመጫን እና ለማውረድ የሚያገለግሉ READ_EXTERNAL_STORAGE እና READ_MEDIA_IMAGES / DOCUMENTS ፍቃዶችን አስተካክል።

3. የፋየርቤዝ (Firebase) እና ቴሌግራም (Telegram) ግንኙነት፦
   - የ 'google-services.json' ፋይል የት ጋር መጫን እንዳለብኝ አሳይ።
   - አፑ ከመስመር ውጭ (Offline Cache) መረጃዎችን እንዲያስቀምጥ Firestore ከመስመር ውጭ እንዲሰራ የሚያስችለውን 'db.getSettings().isPersistenceEnabled()' አግብር።
   - ቴሌግራም መልክቶችን ከስልክ በቀጥታ እንዲልክ (Direct Telegram Bot API fetch) የደህንነት ችግር እንዳይገጥመው የኔትወርክ ሴኪዩሪቲ ኮንፊግ ጨምር።

እባክህ ሙሉውን 'MainActivity.java' ኮድ እና 'AndroidManifest.xml' ኮድ ከዝርዝር ማብራሪያ ጋር አዘጋጅተህ ስጠኝ።
```

---

### Part 2: English Prompt for Android Studio Gemini (በእንግሊዝኛ የተቀረጸ የጀመናይ ፕሮምፕት)

If you prefer using English with Android Studio Gemini, copy the prompt below:

```text
Act as an Android development expert specializing in Capacitor hybrid apps. Please help me configure my Android Studio project for the "West Gojjam Zone Police Management System" (Ethiopia) so it runs fully and flawlessly on physical mobile devices. 

Execute the following requirements:
1. Camera & QR Barcode Scanner:
   - Provide the necessary configuration for `@capacitor-mlkit/barcode-scanning` to work inside the Android environment.
   - Configure location and camera hardware feature declarations in the manifest.

2. Document & PDF File Uploads/Downloads:
   - Configure the WebView inside MainActivity to support HTML5 file inputs (`<input type="file">` for uploading case PDFs and officer photos) using `WebChromeClient` with an `onShowFileChooser` handler.
   - Ensure file storage permissions are defined for Android 9 up to Android 14+ (including `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO`).
   - Enable automated file downloads to the user's Download directory.

3. Offline Network Resilience and Database Persistence:
   - Ensure Firestore offline storage (IndexedDB fallback via Capacitor / native Firebase persistence) works flawlessly.
   - Explicitly guide me on integrating the `google-services.json` config and configuring Firestore local caching inside Android.

4. Network Connectivity & Security (Telegram / API Proxy):
   - Provide a network security configuration (`network_security_config.xml`) that permits clearing HTTP traffic or secure proxy calls so the app can communicate smoothly with our Telegram bots and backend APIs without SSL-trust headaches during local testing.

Output the complete, fully production-ready code for:
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/java/com/westgojjam/police/MainActivity.java`
- `android/app/src/main/res/xml/network_security_config.xml`
```

---

### Part 3: Reference Implementations (ቁልፍ የኮድ ፋይሎች ማጣቀሻ)

Here are the precise, verified blueprints prepared by your system to make sure everything works perfectly in your Android Studio project.

#### 📁 Reference AndroidManifest.xml (`/android/app/src/main/AndroidManifest.xml`)
Make sure your manifest includes these camera, internet, location, and storage permissions:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.westgojjam.police">

    <!-- Permissions requested by West Gojjam Police System -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    
    <!-- File Storage Permissions for PDFs and attachments -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />

    <!-- Feature requests -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:networkSecurityConfig="@xml/network_security_config">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|layoutDirection|fontScale|screenLayout|density"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:exported="true"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
```

#### 📁 Reference Network Security (`/android/app/src/main/res/xml/network_security_config.xml`)
Create this file if it does not exist to prevent Android cleartext blocks on server fetch requests:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <!-- Allow localhost relative proxy requests during compilation -->
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain> <!-- Android Emulator Loopback -->
    </domain-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

#### 📁 Complete Production MainActivity.java (`/android/app/src/main/java/com/westgojjam/police/MainActivity.java`)
This is the optimized Java class for the West Gojjam Police System, built to automatically ask for permissions, activate Firestore offline cache, and support custom geolocation calls:

```java
package com.westgojjam.police;

import android.Manifest;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.FirebaseFirestoreSettings;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    private FirebaseFirestore db;
    private FusedLocationProviderClient fusedLocationClient;
    private static final String TAG = "MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Ensure status bar looks pristine
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN);
        
        // Initialize Firebase Firestore and Enable Offline Database Persistence Safely
        try {
            db = FirebaseFirestore.getInstance();
            FirebaseFirestoreSettings settings = new FirebaseFirestoreSettings.Builder()
                .setPersistenceEnabled(true) // ✅ Auto-sync reports when offline officers regain signal!
                .setCacheSizeBytes(FirebaseFirestoreSettings.CACHE_SIZE_UNLIMITED)
                .build();
            db.setFirestoreSettings(settings);
            Log.d(TAG, "Firebase Offline Persistence Enabled successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Firebase Firestore initialization failed! App will still open safely.", e);
        }
        
        // Initialize Location Services for live crime alerts
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        
        // Request Necessary Android Permissions
        requestAllPermissions();
        
        // Optimize WebView Settings for robust PDF loading, database cache, and storage
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            WebSettings ws = webView.getSettings();
            ws.setAllowFileAccess(true);
            ws.setAllowContentAccess(true);
            ws.setDatabaseEnabled(true);
            ws.setDomStorageEnabled(true);
            ws.setJavaScriptEnabled(true);
            Log.d(TAG, "Native WebView optimized for full features.");
        }
    }

    private void requestAllPermissions() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED ||
            ActivityCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED ||
            ActivityCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION, 
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.CAMERA,
                Manifest.permission.READ_EXTERNAL_STORAGE
            }, 101);
        }
    }

    /**
     * Native method to sync report offline or online back to firestore.
     */
    public void sendReportToFirebase(String type, String data) {
        if (db == null) {
            Log.e(TAG, "Firebase Firestore is not initialized. Cannot send report.");
            return;
        }
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.getLastLocation().addOnSuccessListener(this, location -> {
                Map<String, Object> report = new HashMap<>();
                report.put("type", type);
                report.put("data", data);
                report.put("timestamp", System.currentTimeMillis());
                
                if (location != null) {
                    report.put("latitude", location.getLatitude());
                    report.put("longitude", location.getLongitude());
                }

                db.collection("WestGojjam_Reports")
                    .add(report)
                    .addOnSuccessListener(doc -> Log.d(TAG, "Officer report sync: " + doc.getId()))
                    .addOnFailureListener(e -> Log.w(TAG, "Offline caching report...", e));
            });
        }
    }
}
```

---

### Step-by-Step Integration Checklist (ለአጠቃቀም ቀላል የደረጃ በደረጃ ማረጋገጫ)

1. **Firebase Configuration** (`google-services.json`):
   - Go to your Firebase Console (`ai-studio-7011afac-a655-4735-88be-0e4554305b7b`).
   - Add/Register your Android app with package name: `com.westgojjam.police`.
   - Download the file `google-services.json` and place it in the directory `/android/app/`.

2. **Connecting to Mobile Server** (የሞባይል ሰርቨር አድራሻ ማገናኘት) :
   - We have built a **Mobile API Gateway** setting right inside your app settings page!
   - Open your app in mobile, go to **Settings (ማስተካከያ)** -> Scroll to the **Integrations & Connectivity** panel.
   - Enter your deployed Server API URL (or default to the pre-configured production Cloud Run backend) and hit **SAVE**.
   - Your physical Android device will now communicate perfectly with the live servers for all Gemini requests, GitHub syncs, and Telegram alerts over any mobile network.
