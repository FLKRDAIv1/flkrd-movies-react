# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep all classes in the app.tauri package and all subpackages
-keep class app.tauri.** { *; }

# Keep all classes in the com.tauri package and all subpackages
-keep class com.tauri.** { *; }

# Keep Wry / JNI generated classes and local app classes
-keep class com.flkrdmovies.app.** { *; }

# Keep all native method declarations across all classes
-keepclasseswithmembernames class * {
    native <methods>;
}

# Preserve WebView Javascript interfaces and standard reflection attributes
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable