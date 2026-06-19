# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# --- React Native Reanimated ---
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# --- Firebase ---
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# --- Google Mobile Ads ---
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }
-keep public class com.google.android.gms.ads.MobileAds {
   public *;
}
# Keep React Native Google Mobile Ads
-keep class io.invertase.firebase.app.** { *; }
-keep class io.invertase.googlemobileads.** { *; }

# --- React Native Screens (React Navigation) ---
-keep class com.swmansion.rnscreens.** { *; }
-keep class androidx.fragment.app.** { *; }
-keep class androidx.activity.** { *; }
-keep class androidx.lifecycle.** { *; }

# --- React Native Gesture Handler ---
-keep class com.swmansion.gesturehandler.** { *; }

# --- React Native SVG ---
-keep public class com.horcrux.svg.** { *; }

# --- React Native Safe Area Context ---
-keep class com.th3rdwave.safeareacontext.** { *; }

# --- Async Storage ---
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# --- Appwrite ---
-keep class io.appwrite.** { *; }

# --- React Native Vector Icons ---
-keep class com.oblador.vectoricons.** { *; }

# --- Google Sign-In ---
-keep class com.google.android.gms.auth.** { *; }

# --- React Native Webview ---
-keep class com.reactnativecommunity.webview.** { *; }

# --- React Native Pager View ---
-keep class com.reactnativepagerview.** { *; }

# --- React Native NetInfo ---
-keep class com.reactnativecommunity.netinfo.** { *; }
