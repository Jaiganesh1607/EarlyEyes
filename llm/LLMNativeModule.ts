// ============================================================
// LLMNativeModule.ts
// Thin TypeScript wrapper around the native "LiteRTModule"
// registered by the Kotlin / Swift files.
// ============================================================

import { NativeModules } from 'react-native';

const { LiteRTModule } = NativeModules;

if (!LiteRTModule) {
  // This warning fires only in dev when the native module hasn't been linked.
  // In production the app will crash on the first call if missing.
  console.warn(
    '[LiteRTModule] Native module not found.\n' +
      'Make sure you have:\n' +
      '  1. Added LiteRTPackage to MainApplication.kt (Android)\n' +
      '  2. Ran `pod install` (iOS)\n' +
      '  3. Rebuilt the native app (npx react-native run-android / run-ios)',
  );
}

export interface NativeLiteRTModule {
  /**
   * Load the model from the given absolute path on the device.
   * Resolves `true` on success, rejects with an error message on failure.
   */
  loadModel(modelPath: string): Promise<boolean>;

  /**
   * Run a single inference pass.
   * @param prompt      Full prompt string (already formatted with Gemma tokens)
   * @param maxTokens   Max output tokens
   * @param temperature Sampling temperature (0.0–1.0)
   * Returns the raw text response from the model.
   */
  runInference(
    prompt: string,
    maxTokens: number,
    temperature: number,
  ): Promise<string>;

  /** Free the model from memory. */
  unloadModel(): Promise<void>;

  /** Returns true if a model is currently loaded. */
  isModelLoaded(): Promise<boolean>;
}

export const LiteRTNative: NativeLiteRTModule = LiteRTModule as NativeLiteRTModule;
