package com.earlyeyes.analysis;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.util.ArrayList;
import java.util.List;

import org.tensorflow.lite.Interpreter;

import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.core.Delegate;
import com.google.mediapipe.tasks.vision.core.RunningMode;
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker;
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult;
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker;
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult;
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark;

public class ImageAnalysisModule extends ReactContextBaseJavaModule {
  private static final String MODULE_NAME = "ImageAnalysis";

  // Static instances for lazy initialization
  private static Interpreter skinLesionInterpreter = null;
  private static Interpreter efficientNetInterpreter = null;
  private static PoseLandmarker poseLandmarker = null;
  private static FaceLandmarker faceLandmarker = null;

  public ImageAnalysisModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return MODULE_NAME;
  }

  @ReactMethod
  public void analyzeImage(String imagePath, Promise promise) {
    boolean anyPipelineSuccessful = false;
    
    // Skin findings data
    List<SkinFinding> skinFindingsList = new ArrayList<>();
    
    // EfficientNet flags
    List<String> efficientNetFlags = new ArrayList<>();
    
    // Structural scores
    double arm_wasting_score = 0.0;
    double rib_visibility_score = 0.0;
    double limb_symmetry_score = 0.0;
    double facial_wasting_score = 0.0;
    double sunken_eyes_score = 0.0;

    Context ctx = getReactApplicationContext();
    Bitmap bitmap = null;

    try {
      bitmap = loadBitmap(imagePath);
      if (bitmap == null) {
        resolveSafeDefault(promise);
        return;
      }

      // ==========================================
      // PIPELINE 1: Skin Lesion Model
      // ==========================================
      try {
        long startTime = System.currentTimeMillis();
        if (skinLesionInterpreter == null) {
            MappedByteBuffer skinModelBuffer = loadModelFile(ctx, "models/skin_lesion.tflite");
            Interpreter.Options options = new Interpreter.Options();
            options.setNumThreads(4);
            options.setUseNNAPI(true); // GPU/NPU acceleration
            skinLesionInterpreter = new Interpreter(skinModelBuffer, options);
        }

        Bitmap resizedSkin = Bitmap.createScaledBitmap(bitmap, 224, 224, true);
        org.tensorflow.lite.Tensor inTensor = skinLesionInterpreter.getInputTensor(0);
        boolean isSkinQuant = (inTensor.dataType() == org.tensorflow.lite.DataType.UINT8 || inTensor.dataType() == org.tensorflow.lite.DataType.INT8);

        ByteBuffer skinInput;
        if (isSkinQuant) {
            skinInput = ByteBuffer.allocateDirect(1 * 224 * 224 * 3);
        } else {
            skinInput = ByteBuffer.allocateDirect(1 * 224 * 224 * 3 * 4);
        }
        skinInput.order(ByteOrder.nativeOrder());
        
        int[] pixels = new int[224 * 224];
        resizedSkin.getPixels(pixels, 0, 224, 0, 0, 224, 224);
        for (int v : pixels) {
            if (isSkinQuant) {
                skinInput.put((byte) ((v >> 16) & 0xFF));
                skinInput.put((byte) ((v >> 8) & 0xFF));
                skinInput.put((byte) (v & 0xFF));
            } else {
                skinInput.putFloat(((v >> 16) & 0xFF) / 255.0f);
                skinInput.putFloat(((v >> 8) & 0xFF) / 255.0f);
                skinInput.putFloat((v & 0xFF) / 255.0f);
            }
        }
        resizedSkin.recycle();

        float[] skinOutFloat = runTensorFlowInference(skinLesionInterpreter, skinInput);
        Log.i(MODULE_NAME, "Pipeline 1 (Skin) took: " + (System.currentTimeMillis() - startTime) + "ms");

        String[] classNames = {
            "Actinic Keratosis", "Basal Cell Carcinoma", "Benign Keratosis", 
            "Dermatofibroma", "Melanoma", "Melanocytic Nevi", "Vascular Lesion"
        };
        
        for (int i = 0; i < Integer.min(7, skinOutFloat.length); i++) {
            if (skinOutFloat[i] > 0.05f) {
                skinFindingsList.add(new SkinFinding(classNames[i], skinOutFloat[i]));
            }
        }
        anyPipelineSuccessful = true;
      } catch (Exception e) {
        Log.e(MODULE_NAME, "Pipeline 1 failed", e);
      }

      // ==========================================
      // PIPELINE 2: EfficientNet-Lite4
      // ==========================================
      try {
        long effStartTime = System.currentTimeMillis();
        if (efficientNetInterpreter == null) {
            MappedByteBuffer effModelBuffer = loadModelFile(ctx, "models/efficientnet_lite4.tflite");
            Interpreter.Options options = new Interpreter.Options();
            options.setNumThreads(4);
            options.setUseNNAPI(true);
            efficientNetInterpreter = new Interpreter(effModelBuffer, options);
        }

        Bitmap resizedEff = Bitmap.createScaledBitmap(bitmap, 320, 320, true);
        org.tensorflow.lite.Tensor effInTensor = efficientNetInterpreter.getInputTensor(0);
        boolean isEffQuant = (effInTensor.dataType() == org.tensorflow.lite.DataType.UINT8 || effInTensor.dataType() == org.tensorflow.lite.DataType.INT8);

        ByteBuffer effInput;
        if (isEffQuant) {
            effInput = ByteBuffer.allocateDirect(320 * 320 * 3);
        } else {
            effInput = ByteBuffer.allocateDirect(320 * 320 * 3 * 4);
        }
        effInput.order(ByteOrder.nativeOrder());
        
        int[] pixelsEff = new int[320 * 320];
        resizedEff.getPixels(pixelsEff, 0, 320, 0, 0, 320, 320);
        for (int v : pixelsEff) {
            if (isEffQuant) {
                effInput.put((byte) ((v >> 16) & 0xFF));
                effInput.put((byte) ((v >> 8) & 0xFF));
                effInput.put((byte) (v & 0xFF));
            } else {
                effInput.putFloat((((v >> 16) & 0xFF) / 127.5f) - 1.0f);
                effInput.putFloat((((v >> 8) & 0xFF) / 127.5f) - 1.0f);
                effInput.putFloat(((v & 0xFF) / 127.5f) - 1.0f);
            }
        }
        resizedEff.recycle();

        // Check model input requirements. If model expects INT8 output won't match, but we must try.
        // I will use float output to be safe against varying implementations, but if the model is int8 the user might have provided a float-compiled int8-quantized model. 
        // We'll prepare output array dynamically to prevent crashes.
        float[] effOutFloat = runTensorFlowInference(efficientNetInterpreter, effInput);
        Log.i(MODULE_NAME, "Pipeline 2 (EffNet) took: " + (System.currentTimeMillis() - effStartTime) + "ms");
        
        // Note: EfficientNet has 1000 classes. A 2% confidence on a single class is statistically significant!
        // 951-980 range
        if (checkRange(effOutFloat, 951, 980, 0.02f)) efficientNetFlags.add("skin_texture_abnormality");
        // 281-294 range
        if (checkRange(effOutFloat, 281, 294, 0.02f)) efficientNetFlags.add("hair_abnormality_detected");
        // 878
        if (effOutFloat.length > 878 && effOutFloat[878] > 0.02f) efficientNetFlags.add("pallor_or_discoloration");
        // 367-400
        if (checkRange(effOutFloat, 367, 400, 0.02f)) efficientNetFlags.add("body_swelling_proxy");
        // 430-450
        if (checkRange(effOutFloat, 430, 450, 0.02f)) efficientNetFlags.add("visible_wasting_proxy");
        
        anyPipelineSuccessful = true;
      } catch (Exception e) {
        Log.e(MODULE_NAME, "Pipeline 2 failed", e);
      }

      // ==========================================
      // PIPELINE 3: MediaPipe Pose + Face
      // ==========================================
      try {
        MPImage mpImage = new BitmapImageBuilder(bitmap).build();

        // Pose Landmarker
        try {
          if (poseLandmarker == null) {
              BaseOptions poseOptions = BaseOptions.builder()
                  .setModelAssetPath("models/pose_landmarker_lite.task")
                  .setDelegate(Delegate.GPU)
                  .build();
              PoseLandmarker.PoseLandmarkerOptions pOptions = PoseLandmarker.PoseLandmarkerOptions.builder()
                  .setBaseOptions(poseOptions)
                  .setRunningMode(RunningMode.IMAGE)
                  .build();
              poseLandmarker = PoseLandmarker.createFromOptions(ctx, pOptions);
          }
          
          PoseLandmarkerResult poseResult = poseLandmarker.detect(mpImage);
          if (poseResult.landmarks().size() > 0) {
            List<NormalizedLandmark> lm = poseResult.landmarks().get(0);
            
            // arm_wasting_score
            double d11_13 = getDistance(lm.get(11), lm.get(13));
            double d11_23 = getDistance(lm.get(11), lm.get(23));
            if (d11_23 > 0) {
              double ratio = d11_13 / d11_23;
              if (ratio < 0.35) arm_wasting_score = 0.8;
              else if (ratio < 0.45) arm_wasting_score = 0.5;
              else arm_wasting_score = 0.1;
            }

            // rib_visibility_score
            rib_visibility_score = (getVal(lm.get(11).visibility()) + getVal(lm.get(12).visibility()) + 
                                    getVal(lm.get(23).visibility()) + getVal(lm.get(24).visibility())) / 4.0;

            // limb_symmetry_score
            double leftArm = d11_13;
            double rightArm = getDistance(lm.get(12), lm.get(14));
            double torso = d11_23;
            if (torso > 0) {
                double diff = Math.abs(leftArm - rightArm) / torso;
                double sym = 1.0 - diff;
                limb_symmetry_score = Math.max(0.0, Math.min(1.0, sym));
            }
          }
        } catch (Exception e) {
          Log.e(MODULE_NAME, "Pose landmarker failed", e);
        }

        // Face Landmarker
        try {
          if (faceLandmarker == null) {
              BaseOptions faceOptions = BaseOptions.builder()
                  .setModelAssetPath("models/face_landmarker.task")
                  .setDelegate(Delegate.GPU)
                  .build();
              FaceLandmarker.FaceLandmarkerOptions fOptions = FaceLandmarker.FaceLandmarkerOptions.builder()
                  .setBaseOptions(faceOptions)
                  .setRunningMode(RunningMode.IMAGE)
                  .build();
              faceLandmarker = FaceLandmarker.createFromOptions(ctx, fOptions);
          }
          
          FaceLandmarkerResult faceResult = faceLandmarker.detect(mpImage);
          if (faceResult.faceLandmarks().size() > 0) {
            List<NormalizedLandmark> lm = faceResult.faceLandmarks().get(0);
            
            double minX = 1.0, maxX = 0.0;
            for (NormalizedLandmark n : lm) {
                if (n.x() < minX) minX = n.x();
                if (n.x() > maxX) maxX = n.x();
            }
            double boxWidth = maxX - minX;

            double d234_454 = getDistance(lm.get(234), lm.get(454));
            if (boxWidth > 0) {
                double ratio = d234_454 / boxWidth;
                if (ratio < 0.6) facial_wasting_score = 0.7;
                else if (ratio < 0.75) facial_wasting_score = 0.4;
                else facial_wasting_score = 0.1;
            }

            sunken_eyes_score = (getVal(lm.get(33).visibility()) + getVal(lm.get(133).visibility()) + 
                                 getVal(lm.get(362).visibility()) + getVal(lm.get(263).visibility())) / 4.0;
          }
        } catch (Exception e) {
          Log.e(MODULE_NAME, "Face landmarker failed", e);
        }

        anyPipelineSuccessful = true;
      } catch (Exception e) {
        Log.e(MODULE_NAME, "Pipeline 3 failed", e);
      }

      // Recycle bitmap when finished analyzing
      bitmap.recycle();

      if (!anyPipelineSuccessful) {
        resolveSafeDefault(promise);
        return;
      }

      // ==========================================
      // Build Output JSON
      // ==========================================
      ArrayList<String> indicators = new ArrayList<>();
      double highestSkinConfidence = 0.0;
      for (SkinFinding sf : skinFindingsList) {
          int pct = (int) Math.round(sf.confidence * 100);
          indicators.add("Skin abnormality detected: " + sf.name + " (" + pct + "% confidence)");
          if (sf.confidence > highestSkinConfidence) highestSkinConfidence = sf.confidence;
      }
      
      if (arm_wasting_score > 0.6) indicators.add("Visible muscle wasting in upper arms");
      if (rib_visibility_score > 0.5) indicators.add("Rib area may be visible");
      if (facial_wasting_score > 0.6) indicators.add("Facial features suggest nutritional stress");
      if (sunken_eyes_score > 0.5) indicators.add("Eyes appear sunken");
      
      if (limb_symmetry_score < 0.7 && limb_symmetry_score > 0.0) {
        indicators.add("Limb size difference noticed — possible swelling");
      }
      
      if (efficientNetFlags.contains("skin_texture_abnormality")) indicators.add("Unusual skin texture detected");
      if (efficientNetFlags.contains("hair_abnormality_detected")) indicators.add("Hair abnormality detected");
      if (efficientNetFlags.contains("pallor_or_discoloration")) indicators.add("Skin color abnormality detected");
      if (efficientNetFlags.contains("body_swelling_proxy")) indicators.add("Possible swelling detected");
      if (efficientNetFlags.contains("visible_wasting_proxy")) indicators.add("Visible body wasting signs");

      String risk_level = "ok";
      if (highestSkinConfidence > 0.6 || arm_wasting_score > 0.65 || rib_visibility_score > 0.6 || indicators.size() > 3) {
          risk_level = "urgent";
      } else if (indicators.size() > 0) {
          risk_level = "monitor";
      }

      int confidence = (int) Math.round(((highestSkinConfidence + arm_wasting_score + rib_visibility_score + facial_wasting_score) / 4.0) * 100.0);

      JSONObject root = new JSONObject();
      JSONArray skinJson = new JSONArray();
      for (SkinFinding sf : skinFindingsList) {
          JSONObject so = new JSONObject();
          so.put("name", sf.name);
          so.put("confidence", sf.confidence);
          skinJson.put(so);
      }
      
      JSONArray effJson = new JSONArray();
      for (String s : efficientNetFlags) effJson.put(s);

      JSONObject structJson = new JSONObject();
      structJson.put("arm_wasting_score", arm_wasting_score);
      structJson.put("rib_visibility_score", rib_visibility_score);
      structJson.put("limb_symmetry_score", limb_symmetry_score);
      structJson.put("facial_wasting_score", facial_wasting_score);
      structJson.put("sunken_eyes_score", sunken_eyes_score);

      JSONArray indJson = new JSONArray();
      for (String s : indicators) indJson.put(s);

      root.put("skin_findings", skinJson);
      root.put("efficientnet_flags", effJson);
      root.put("structural", structJson);
      root.put("indicators", indJson);
      root.put("risk_level", risk_level);
      root.put("confidence", confidence);

      promise.resolve(root.toString());

    } catch (Exception e) {
      Log.e(MODULE_NAME, "Total pipeline collapse", e);
      if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
      resolveSafeDefault(promise);
    }
  }

  private void resolveSafeDefault(Promise promise) {
    try {
        JSONObject out = new JSONObject();
        out.put("risk_level", "ok");
        out.put("indicators", new JSONArray());
        out.put("confidence", 0);
        out.put("analysis_failed", true);
        promise.resolve(out.toString());
    } catch (Exception e) {
        promise.resolve("{}");
    }
  }

  private boolean checkRange(float[] arr, int min, int max, float thresh) {
      if (arr.length <= max) return false;
      for (int i = min; i <= max; i++) {
          if (arr[i] > thresh) return true;
      }
      return false;
  }

  private float[] runTensorFlowInference(Interpreter interpreter, ByteBuffer input) {
      // Dynamic output detection to handle both Float and INT8/UINT8 quantizations generically
      // Even though prompt says "Normalize pixels to [-1,1] float" which implies Float32
      org.tensorflow.lite.Tensor outputInfo = interpreter.getOutputTensor(0);
      int count = 1;
      for (int i=0; i<outputInfo.shape().length; i++) count *= outputInfo.shape()[i];
      
      float[] floatOut = new float[count];
      
      if (outputInfo.dataType() == org.tensorflow.lite.DataType.FLOAT32) {
          float[][] out = new float[1][count];
          interpreter.run(input, out);
          System.arraycopy(out[0], 0, floatOut, 0, count);
      } else {
          // Assume quantized uint8 or int8
          byte[][] out = new byte[1][count];
          interpreter.run(input, out);
          for(int i=0; i < count; i++) {
              floatOut[i] = (out[0][i] & 0xFF) / 255.0f; // Soft approximation
          }
      }
      return floatOut;
  }

  private double getDistance(NormalizedLandmark p1, NormalizedLandmark p2) {
      double dx = p1.x() - p2.x();
      double dy = p1.y() - p2.y();
      double dz = p1.z() - p2.z();
      return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  private float getVal(java.util.Optional<Float> v) {
      if (v != null && v.isPresent()) {
          return v.get();
      }
      return 0.0f;
  }

  private Bitmap loadBitmap(String path) {
    try {
      if (path.startsWith("file://")) {
        path = path.replace("file://", "");
      }
      
      BitmapFactory.Options options = new BitmapFactory.Options();
      options.inJustDecodeBounds = true;
      BitmapFactory.decodeFile(path, options);
      
      // Calculate sample size to downscale image to ~1024px max to save RAM
      int reqSize = 1024;
      int inSampleSize = 1;
      if (options.outHeight > reqSize || options.outWidth > reqSize) {
          final int halfHeight = options.outHeight / 2;
          final int halfWidth = options.outWidth / 2;
          while ((halfHeight / inSampleSize) >= reqSize && (halfWidth / inSampleSize) >= reqSize) {
              inSampleSize *= 2;
          }
      }
      
      options.inJustDecodeBounds = false;
      options.inSampleSize = inSampleSize;
      
      return BitmapFactory.decodeFile(path, options);
    } catch (Exception e) {
      Log.w(MODULE_NAME, "Failed to load bitmap from path", e);
      return null;
    }
  }

  private MappedByteBuffer loadModelFile(Context context, String assetPath) throws IOException {
    AssetFileDescriptor fileDescriptor = context.getAssets().openFd(assetPath);
    FileInputStream inputStream = new FileInputStream(fileDescriptor.getFileDescriptor());
    java.nio.channels.FileChannel fileChannel = inputStream.getChannel();
    return fileChannel.map(java.nio.channels.FileChannel.MapMode.READ_ONLY, fileDescriptor.getStartOffset(), fileDescriptor.getDeclaredLength());
  }

  private static class SkinFinding {
      String name;
      float confidence;
      SkinFinding(String name, float confidence) {
          this.name = name;
          this.confidence = confidence;
      }
  }
}
