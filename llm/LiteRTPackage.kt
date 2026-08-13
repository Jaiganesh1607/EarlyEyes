// ============================================================
// LiteRTPackage.kt
// Place this file at:
//   android/app/src/main/java/com/YOUR_APP_PACKAGE/litert/LiteRTPackage.kt
//
// Replace "com.YOUR_APP_PACKAGE" with your actual package name.
// ============================================================

package com.YOUR_APP_PACKAGE.litert

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LiteRTPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(LiteRTModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
