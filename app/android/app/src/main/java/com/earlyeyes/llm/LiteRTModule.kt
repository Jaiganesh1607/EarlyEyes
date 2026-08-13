package com.earlyeyes.llm

import com.facebook.react.bridge.*
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import kotlinx.coroutines.*

class LiteRTModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var llmInference: LlmInference? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "LiteRTModule"

    @ReactMethod
    fun loadModel(modelPath: String, promise: Promise) {
        scope.launch {
            try {
                llmInference?.close()
                llmInference = null

                val options = LlmInference.LlmInferenceOptions.builder()
                    .setModelPath(modelPath)
                    .setMaxTokens(2048)
                    .setMaxTopK(40)
                    .setTemperature(0.05f)
                    .setPreferredBackend(LlmInference.Backend.GPU)
                    .build()

                llmInference = LlmInference.createFromOptions(reactContext, options)
                promise.resolve(true)
            } catch (e: Exception) {
                try {
                    val cpuOptions = LlmInference.LlmInferenceOptions.builder()
                        .setModelPath(modelPath)
                        .setMaxTokens(2048)
                        .setMaxTopK(40)
                        .setTemperature(0.05f)
                        .setPreferredBackend(LlmInference.Backend.CPU)
                        .build()

                    llmInference = LlmInference.createFromOptions(reactContext, cpuOptions)
                    promise.resolve(true)
                } catch (cpuError: Exception) {
                    promise.reject("LOAD_ERROR", "Failed to load model: ${cpuError.message}", cpuError)
                }
            }
        }
    }

    @ReactMethod
    fun runInference(prompt: String, maxTokens: Int, temperature: Double, promise: Promise) {
        scope.launch {
            try {
                val inference = llmInference
                    ?: return@launch promise.reject(
                        "NOT_LOADED",
                        "Model is not loaded. Call loadModel() first."
                    )

                val result = inference.generateResponse(prompt)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("INFERENCE_ERROR", "Inference failed: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun unloadModel(promise: Promise) {
        try {
            llmInference?.close()
            llmInference = null
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("UNLOAD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isModelLoaded(promise: Promise) {
        promise.resolve(llmInference != null)
    }

    override fun onCatalystInstanceDestroy() {
        scope.cancel()
        llmInference?.close()
        llmInference = null
    }
}
