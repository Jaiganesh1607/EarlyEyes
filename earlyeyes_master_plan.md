# EarlyEyes — Complete Master Architecture & Build Plan
> React Native Offline Android App | Gemma 4 E2B Fine-tuned | Hackathon-Ready

---
# FINAL PROBLEM STATEMENT

Every year, 3.1 million children die from malnutrition. Not from lack of treatment — from lack of detection.

The signs of severe wasting are visible to a trained eye. A mid-upper arm that has lost its muscle. Bilateral swelling in the feet — a sign of kwashiorkor. Ribs visible through skin. Hair that has turned reddish and brittle. A trained health worker sees these and acts immediately.

But in a flood-displaced camp in Bangladesh, a conflict zone in South Sudan, a remote village in Guatemala — there is no trained health worker visiting this week. Or this month. There is a mother. There is a grandmother. There is a community volunteer. None of them know what bilateral pitting edema looks like. None of them know that a 2-year-old's thin arms are an emergency. They see a thin child. They think this is how things are here.

42.8 million children are wasting right now. Most of their caregivers don't know.

The bottleneck is not treatment. RUTF (Ready-to-Use Therapeutic Food) exists. Outpatient treatment protocols exist. The bottleneck is the moment a caregiver decides their child needs help. That moment currently depends entirely on luck — on whether a health worker happens to visit before the window closes.

**Existing tools fail this problem completely:**

- MUAC tapes and scales require equipment and training
- Cloud AI tools cannot legally be deployed where patient data sovereignty laws apply
- Apps requiring internet don't work where malnutrition is worst
- No existing tool speaks to a mother in her language, on her phone, offline

**EarlyEyes is not a diagnostic tool. It does not replace a doctor. It is the moment a mother decides to find one.**

---

## FINAL SOLUTION EXPLANATION

EarlyEyes is an offline, multimodal AI early warning system that runs entirely on an Android phone. A caregiver photographs their child. EarlyEyes analyzes the photo using a fine-tuned Gemma 4 E2B model, cross-references WHO clinical indicators via on-device RAG, and tells the caregiver in their own language whether to seek help — and exactly what to tell the doctor.

## SECTION 1: TECHNOLOGY DECISIONS (JUSTIFIED)

### 1.1 CV Model: MobileNetV3-Small (TFLite)
- **Why not EfficientDet**: EfficientDet is an object detector. We need a feature extractor + classifier for visible wasting signs — MobileNetV3-Small is the right architecture.
- **Why MobileNetV3-Small over Large**: Small = ~10MB, ~50ms on low-end Android. Large = ~22MB, ~90ms. Small is sufficient for binary/ternary triage classification.
- **Role**: Runs FIRST on the image. Extracts visual indicators (wasting signs, edema proxies, visible rib prominence). Outputs a structured indicator vector. This is passed to Gemma as text — Gemma never processes the raw image. This eliminates Gemma image latency entirely on low-end devices.
- **Format**: `.tflite` INT8 quantized. Size: ~5MB on disk.

### 1.2 Gemma 4 E2B: Text-only inference on device
- **Input to Gemma**: Text only — CV model output (indicator list) + voice transcript + RAG context.
- **Why this is better than Gemma doing vision**: Gemma E2B vision inference on 3-4GB RAM Android = 8-15 seconds per image. MobileNetV3 + Gemma text = under 3 seconds total.
- **Runtime**: `react-native-fast-tflite` — confirmed working for TFLite models on Android RN. No custom native module needed for inference.
- **Model format**: LoRA merged into base → INT4 quantized → `.tflite` via AI Edge Torch. Size: ~1.1GB on device.

### 1.3 Whisper: whisper-base (whisper.cpp via RNLLM or custom JNI bridge)
- **Why base over tiny**: Base = 142MB, significantly better on accented speech (Bengali, Amharic, Tamil). Tiny fails on non-English accents at unacceptable rates for a medical app.
- **Why whisper.cpp**: Runs on CPU, no GPU needed, well-tested on Android via JNI.
- **RN bridge**: Use `react-native-whisper` (wraps whisper.cpp) — confirmed Android support, avoids writing JNI from scratch.
- **Format**: `ggml-base.bin` — 142MB.

### 1.4 Vector DB: FAISS (via react-native-executorch or pre-built index)
- **Why FAISS over ChromaDB**: ChromaDB requires a Python server. FAISS flat index is a single binary file, queryable in C++/Java. For React Native, we pre-build the FAISS index at build time (Python script) and ship the `.index` file as a static asset.
- **Query at runtime**: Via a lightweight Java/JNI wrapper. Index size for our RAG JSON: ~8-12MB.
- **Alternative if FAISS JNI proves unstable**: SQLite with FTS5 (full-text search) — SQLite is natively supported in RN via `react-native-sqlite-storage`. Use as fallback.
- **Primary plan**: FAISS pre-built index + Java JNI query wrapper (small, ~200 lines Java).

### 1.5 10 Priority Languages
| Code | Language | Region |
|------|----------|--------|
| `ta` | Tamil | South India, Sri Lanka |
| `hi` | Hindi | North India |
| `en` | English | Global fallback |
| `bn` | Bengali | Bangladesh, East India |
| `sw` | Swahili | East Africa (Kenya, Tanzania, Uganda) |
| `ha` | Hausa | West Africa (Nigeria, Niger, Ghana) |
| `am` | Amharic | Ethiopia |
| `es` | Spanish | Latin America (Guatemala, Bolivia, Peru) |
| `fr` | French | West/Central Africa (Mali, DRC, Burkina Faso) |
| `ur` | Urdu | Pakistan |

---

## SECTION 2: MODEL PREPARATION PIPELINE (Pre-Build, Done Once)

### Step 1: Merge LoRA into Base
```
Base: google/gemma-4-e2b-it
Adapter: your HF repo (adapter_model.safetensors + adapter_config.json)
Tool: HuggingFace PEFT merge_and_unload()
Output: merged_gemma4_e2b/ (full weights)
```

### Step 2: Quantize to INT4
```
Tool: AI Edge Torch (Google) or llama.cpp quantize
Method: INT4 group-wise quantization
Output: gemma4_e2b_int4.tflite (~1.1GB)
```

### Step 3: Convert MobileNetV3 to TFLite INT8
```
Base: torchvision MobileNetV3-Small pretrained
Fine-tune head: on visible wasting indicator dataset (or use as feature extractor with custom classifier head)
Output: mobilenet_wasting.tflite (~5MB)
```

### Step 4: Build FAISS Index
```
Input: your RAG JSON file
Script: Python — chunk content field, embed with sentence-transformers (all-MiniLM-L6-v2), build FAISS flat index
Output: rag.index (~10MB) + chunk_map.json (id → text mapping)
```

### Step 5: Package Whisper
```
Download: ggml-base.bin from whisper.cpp releases
No conversion needed.
Size: 142MB
```

---

## SECTION 3: COMPLETE FOLDER STRUCTURE

```
EarlyEyes/
│
├── android/                          # RN Android native layer
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/earlyeyes/
│   │   │   │   ├── faiss/
│   │   │   │   │   ├── FaissModule.java        # JNI bridge: query FAISS index
│   │   │   │   │   └── FaissPackage.java        # RN package registration
│   │   │   │   └── MainApplication.java
│   │   │   ├── jni/
│   │   │   │   ├── faiss_query.cpp             # FAISS query logic in C++
│   │   │   │   └── CMakeLists.txt
│   │   │   └── assets/
│   │   │       ├── models/
│   │   │       │   ├── gemma4_e2b_int4.tflite  # 1.1GB — Gemma text inference
│   │   │       │   └── mobilenet_wasting.tflite # 5MB — CV image analysis
│   │   │       ├── rag/
│   │   │       │   ├── rag.index               # FAISS index (~10MB)
│   │   │       │   └── chunk_map.json          # chunk id → text
│   │   │       ├── whisper/
│   │   │       │   └── ggml-base.bin           # 142MB
│   │   │       ├── facilities/
│   │   │       │   └── facilities.db           # SQLite offline facility DB
│   │   │       └── i18n/                       # Static translation strings
│   │   │           ├── en.json
│   │   │           ├── ta.json
│   │   │           ├── hi.json
│   │   │           ├── bn.json
│   │   │           ├── sw.json
│   │   │           ├── ha.json
│   │   │           ├── am.json
│   │   │           ├── es.json
│   │   │           ├── fr.json
│   │   │           └── ur.json
│   │   └── build.gradle
│   └── build.gradle
│
├── src/
│   ├── screens/                      # All UI screens (Frontend)
│   │   ├── SplashScreen.tsx
│   │   ├── LanguageSelectScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── InputMethodScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── VoiceInputScreen.tsx
│   │   ├── ProcessingScreen.tsx
│   │   └── ResultScreen.tsx
│   │   └── HistoryScreen.tsx
│   │   └── FacilityScreen.tsx
│   │   └── SettingsScreen.tsx
│   │
│   ├── components/                   # Reusable UI components (Frontend)
│   │   ├── RiskCard.tsx              # 🔴🟡🟢 output card
│   │   ├── IndicatorBadge.tsx        # Individual sign badge
│   │   ├── VoiceWaveform.tsx         # Recording animation
│   │   ├── LoadingOverlay.tsx        # Processing spinner with step text
│   │   ├── DisclaimerBanner.tsx      # Always-visible disclaimer
│   │   ├── LanguagePicker.tsx        # Language selector dropdown
│   │   ├── FacilityCard.tsx          # Nearest facility display
│   │   └── IconButton.tsx            # Large accessible button
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx          # React Navigation stack definition
│   │
│   ├── services/                     # Backend logic (AI, DB, RAG)
│   │   ├── cv/
│   │   │   ├── ImageAnalyzer.ts      # Loads mobilenet_wasting.tflite, runs inference, returns indicator JSON
│   │   │   └── IndicatorMapper.ts    # Maps model output indices → WHO indicator names
│   │   │
│   │   ├── gemma/
│   │   │   ├── GemmaEngine.ts        # Loads gemma4_e2b_int4.tflite, runs text inference
│   │   │   ├── PromptBuilder.ts      # Builds structured prompt from indicators + RAG context + language
│   │   │   └── ResponseParser.ts     # Parses Gemma JSON output → app data model
│   │   │
│   │   ├── whisper/
│   │   │   └── WhisperEngine.ts      # Wraps react-native-whisper, records audio, returns transcript
│   │   │
│   │   ├── rag/
│   │   │   ├── FaissQuery.ts         # Calls FaissModule native bridge, returns top-k chunks
│   │   │   └── RAGPipeline.ts        # Takes indicator list → queries FAISS → returns context string
│   │   │
│   │   ├── db/
│   │   │   ├── DatabaseManager.ts    # SQLite init, migrations
│   │   │   ├── AssessmentRepository.ts # CRUD for assessment history
│   │   │   └── FacilityRepository.ts   # Query nearest facility by GPS
│   │   │
│   │   └── pipeline/
│   │       └── AssessmentPipeline.ts  # Orchestrates: CV → RAG → Gemma → Parse → Save
│   │
│   ├── i18n/
│   │   ├── index.ts                  # i18n init, language detection, t() function
│   │   └── types.ts                  # TypeScript types for translation keys
│   │
│   ├── store/
│   │   ├── appStore.ts               # Zustand store — app state (language, loading, results)
│   │   └── assessmentStore.ts        # Zustand store — current assessment state
│   │
│   ├── types/
│   │   ├── assessment.ts             # Assessment, RiskLevel, Indicator types
│   │   ├── facility.ts               # Facility type
│   │   └── rag.ts                    # RAGChunk type
│   │
│   ├── utils/
│   │   ├── imageUtils.ts             # Camera image → base64, resize to 224x224 for MobileNet
│   │   ├── gpsUtils.ts               # Get current GPS coords
│   │   └── languageUtils.ts          # Detect phone language, map to supported language code
│   │
│   └── constants/
│       ├── languages.ts              # Supported language list with display names
│       ├── riskLevels.ts             # Risk level constants and colors
│       └── modelConfig.ts            # Model paths, inference params
│
├── scripts/                          # Pre-build Python scripts (run once by developer)
│   ├── merge_lora.py                 # Merge LoRA adapter into base Gemma E2B
│   ├── quantize_gemma.py             # INT4 quantize merged model → .tflite
│   ├── convert_mobilenet.py          # Export MobileNetV3 → TFLite INT8
│   ├── build_faiss_index.py          # Chunk RAG JSON → embed → build FAISS index
│   └── build_facility_db.py          # WHO facility CSV → SQLite facilities.db
│
├── assets/                           # Static app assets
│   ├── icons/
│   │   ├── risk_red.png
│   │   ├── risk_yellow.png
│   │   ├── risk_green.png
│   │   └── app_icon.png
│   └── fonts/
│       └── NotoSans-Regular.ttf      # Supports all 10 languages including Tamil, Amharic
│
├── App.tsx                           # Root component
├── index.js                          # RN entry point
├── package.json
├── tsconfig.json
├── babel.config.js
└── README.md                         # Hackathon: setup in under 5 commands
```

---

## SECTION 4: ALL SCREENS — COMPLETE FLOW

### Screen 1: SplashScreen
- **Route**: `/splash`
- **Purpose**: App launch, model loading check, first-run detection
- **UI**: App logo, tagline in detected language, loading bar showing model init progress
- **Logic**: Check if models are loaded (first run = copy from assets to app storage). If first run → LanguageSelect. Else → Home.
- **Components**: LoadingOverlay

### Screen 2: LanguageSelectScreen
- **Route**: `/language-select`
- **Purpose**: User selects preferred language. Shown only on first run or from Settings.
- **UI**: Grid of 10 language options each showing native script name (தமிழ், हिंदी, English, বাংলা, Kiswahili, Hausa, አማርኛ, Español, Français, اردو). Large buttons, icon-first.
- **Logic**: Saves language code to AsyncStorage. Updates i18n. Navigates to Onboarding.
- **Components**: LanguagePicker

### Screen 3: OnboardingScreen
- **Route**: `/onboarding`
- **Purpose**: 3-slide explainer for first-time users. Low-literacy friendly — icons + one sentence per slide.
- **Slides**: (1) "Take a photo of your child" (2) "We check for warning signs" (3) "We tell you if you need a doctor"
- **UI**: All text in selected language. Skip button. Every word translatable.
- **Logic**: Shown once. Saves seen flag. Navigates to Home.

### Screen 4: HomeScreen
- **Route**: `/home`
- **Purpose**: Main hub. Primary action = start new assessment.
- **UI**: Large "Check My Child" button (full width, red-bordered for urgency). Secondary: History button. Settings icon top-right. Disclaimer banner bottom (always visible).
- **Logic**: Navigates to InputMethodScreen on primary button press.
- **Components**: DisclaimerBanner, IconButton

### Screen 5: InputMethodScreen
- **Route**: `/input-method`
- **Purpose**: Choose between photo or voice input.
- **UI**: Two large cards — 📷 "Take Photo" and 🎙️ "Describe Symptoms by Voice". Both in selected language.
- **Logic**: Navigate to CameraScreen or VoiceInputScreen.

### Screen 6: CameraScreen
- **Route**: `/camera`
- **Purpose**: Capture child photo for CV analysis.
- **UI**: Full-screen camera preview. Single large shutter button. Brief instruction text (e.g., "Take a clear photo of your child's full body" — translated). No zoom, no flash controls — simplicity first.
- **Logic**: Uses `react-native-vision-camera`. On capture → resize image to 224×224 → pass to AssessmentPipeline → navigate to ProcessingScreen.
- **Components**: IconButton

### Screen 7: VoiceInputScreen
- **Route**: `/voice-input`
- **Purpose**: Record caregiver describing symptoms by voice.
- **UI**: Large microphone button. VoiceWaveform animation while recording. "Tap to stop" instruction. Transcript appears below in real time (if possible) or after recording stops.
- **Logic**: Uses react-native-whisper to record + transcribe. Transcript passed to AssessmentPipeline as text input. Navigate to ProcessingScreen.
- **Components**: VoiceWaveform, IconButton

### Screen 8: ProcessingScreen
- **Route**: `/processing`
- **Purpose**: Show progress while pipeline runs (CV → RAG → Gemma). Prevents user abandonment.
- **UI**: Step-by-step progress indicators: "Analyzing photo…" → "Checking health guidelines…" → "Preparing your result…". Animated. Estimated time shown. All text translated.
- **Logic**: Pipeline runs async. On completion → navigate to ResultScreen with result data.
- **Components**: LoadingOverlay

### Screen 9: ResultScreen
- **Route**: `/result`
- **Purpose**: Show assessment output. THE most important screen.
- **UI**:
  - Top: Large colored banner — 🔴 URGENT / 🟡 MONITOR / 🟢 OK (with translated text)
  - Middle: "What we noticed" — list of indicators in plain translated language
  - "What to tell your doctor" — structured brief, copyable
  - "Nearest health facility" — name + distance (tappable → FacilityScreen)
  - Bottom: Disclaimer banner (always visible, never dismissable)
  - Share button: saves result card as image (no cloud upload)
- **Logic**: Renders parsed Gemma output. Saves to AssessmentRepository. Shows facility from FacilityRepository.
- **Components**: RiskCard, IndicatorBadge, FacilityCard, DisclaimerBanner

### Screen 10: HistoryScreen
- **Route**: `/history`
- **Purpose**: List of past assessments.
- **UI**: Chronological list. Each item shows date, risk level color, primary indicator. Tappable to view full past result.
- **Logic**: Reads from AssessmentRepository (SQLite). Navigates to ResultScreen with historical data.
- **Components**: RiskCard (compact variant)

### Screen 11: FacilityScreen
- **Route**: `/facility`
- **Purpose**: Show nearest health facilities.
- **UI**: List of 3-5 nearest facilities with name, type (clinic/hospital/nutrition center), distance. No map (avoids internet dependency).
- **Logic**: Queries FacilityRepository with current GPS. Offline SQLite.
- **Components**: FacilityCard

### Screen 12: SettingsScreen
- **Route**: `/settings`
- **Purpose**: Language change, app info, disclaimer full text.
- **UI**: Language selector, app version, "About EarlyEyes", full disclaimer text.
- **Logic**: Language change → re-renders entire app via i18n context.
- **Components**: LanguagePicker

---

## SECTION 5: BACKEND SERVICES — DETAILED DESCRIPTIONS

### 5.1 AssessmentPipeline.ts (Orchestrator)
The single entry point for all assessments. Coordinates all backend services in sequence.

**Steps**:
1. Receive input (image path OR voice transcript)
2. If image: call `ImageAnalyzer.analyze(imagePath)` → get `indicators[]`
3. If voice: transcript already available → extract symptom keywords → format as `indicators[]`
4. Call `RAGPipeline.query(indicators)` → get `ragContext` string
5. Call `PromptBuilder.build(indicators, ragContext, language)` → get `prompt`
6. Call `GemmaEngine.infer(prompt)` → get raw JSON string
7. Call `ResponseParser.parse(rawJSON)` → get `AssessmentResult`
8. Call `FacilityRepository.getNearest(gps)` → attach facility to result
9. Call `AssessmentRepository.save(result)`
10. Return `AssessmentResult` to ProcessingScreen

### 5.2 ImageAnalyzer.ts
- Loads `mobilenet_wasting.tflite` via `react-native-fast-tflite`
- Preprocesses: resize to 224×224, normalize pixel values to [-1, 1]
- Runs inference: outputs logits for each wasting indicator class
- Passes logits to `IndicatorMapper.ts`

### 5.3 IndicatorMapper.ts
- Maps MobileNetV3 output class indices to WHO indicator names
- Output example: `[{name: "visible_muscle_wasting", confidence: 0.82}, {name: "bilateral_edema_proxy", confidence: 0.41}]`
- Threshold: only include indicators with confidence > 0.35

### 5.4 GemmaEngine.ts
- Loads `gemma4_e2b_int4.tflite` via `react-native-fast-tflite`
- Manages token budget (max 512 input, 256 output for speed on low-end device)
- Runs autoregressive inference
- Returns raw string output

### 5.5 PromptBuilder.ts
Builds the exact prompt sent to Gemma. Structure:
```
[SYSTEM]: You are EarlyEyes, a child malnutrition early warning assistant.
You ONLY output valid JSON. Language: {language_code}.
Clinical context: {ragContext}

[USER]: Visual indicators observed: {indicators_json}
Child estimated age: {age_if_provided}
Caregiver voice description: {transcript_if_any}

Respond ONLY with this JSON structure:
{
  "risk_level": "urgent|monitor|ok",
  "indicators_noticed": [],
  "plain_language": "",
  "tell_your_doctor": "",
  "confidence": 0-100,
  "uncertainty": "",
  "disclaimer": "This is not a diagnosis. Only a doctor can confirm."
}
```

### 5.6 ResponseParser.ts
- Parses Gemma output string to JSON
- Validates all required fields exist
- Falls back to safe defaults if parsing fails (never crashes — always shows a result)
- Maps `risk_level` string to `RiskLevel` enum

### 5.7 WhisperEngine.ts
- Wraps `react-native-whisper`
- Records audio via device microphone
- Runs whisper-base offline transcription
- Detects language from audio (whisper has built-in language detection)
- Returns transcript string + detected language code

### 5.8 FaissQuery.ts
- Calls `FaissModule` native Java bridge
- Input: query text (indicator list as string)
- The Java bridge embeds query using a lightweight embedding (pre-computed TF-IDF or MiniLM via ONNX)
- Returns top-3 chunk IDs
- Looks up chunk text from `chunk_map.json`

### 5.9 RAGPipeline.ts
- Takes `indicators[]` → formats as query string
- Calls `FaissQuery.query(queryString)`
- Concatenates returned chunks into `ragContext` string
- Truncates to 800 tokens max (fits in Gemma prompt budget)

### 5.10 DatabaseManager.ts
- Initializes SQLite via `react-native-sqlite-storage`
- Creates two tables on first run:
  - `assessments`: id, timestamp, risk_level, indicators_json, plain_language, tell_doctor, facility_id, language
  - (facilities table is pre-populated from `facilities.db` asset — copied on first run)

### 5.11 AssessmentRepository.ts
- `save(result: AssessmentResult)`: insert into assessments table
- `getAll()`: return all assessments ordered by timestamp desc
- `getById(id)`: return single assessment

### 5.12 FacilityRepository.ts
- `getNearest(lat, lon, limit=5)`: Haversine distance query on SQLite facilities table
- Returns array of `Facility` objects sorted by distance

---

## SECTION 6: MULTILINGUAL ARCHITECTURE

### 6.1 Approach
- Static UI strings: JSON files per language in `android/app/src/main/assets/i18n/`
- Runtime AI output: Gemma generates output in the selected language (enforced via PromptBuilder — language code injected into system prompt)
- Whisper: auto-detects input language, transcribes, passes language hint to Gemma

### 6.2 i18n/index.ts
- Loads correct JSON file based on stored language preference
- Exposes `t(key)` function used in every screen and component
- Falls back to English if key missing in selected language

### 6.3 Translation File Structure (each language JSON)
Keys required (same in all 10 files):
```json
{
  "app_name": "EarlyEyes",
  "tagline": "...",
  "btn_check_child": "...",
  "btn_take_photo": "...",
  "btn_voice_input": "...",
  "risk_urgent": "...",
  "risk_monitor": "...",
  "risk_ok": "...",
  "what_noticed": "...",
  "tell_doctor": "...",
  "nearest_facility": "...",
  "disclaimer": "...",
  "processing_step_1": "...",
  "processing_step_2": "...",
  "processing_step_3": "...",
  "history_title": "...",
  "settings_title": "...",
  "onboarding_1": "...",
  "onboarding_2": "...",
  "onboarding_3": "..."
}
```

### 6.4 Gemma Language Instruction
In PromptBuilder, the system prompt includes:
`"Respond entirely in the language with ISO code: {lang_code}. If you cannot respond in that language, respond in English."`

This forces Gemma's `plain_language` and `tell_your_doctor` fields into the caregiver's language.

---

## SECTION 7: KEY DEPENDENCIES (package.json)

| Package | Purpose |
|---|---|
| `react-native-fast-tflite` | Run .tflite models (Gemma + MobileNet) |
| `react-native-whisper` | Offline voice transcription |
| `react-native-vision-camera` | Camera capture |
| `react-native-sqlite-storage` | SQLite for assessments + facilities |
| `react-native-fs` | File system access (copy assets on first run) |
| `react-native-geolocation-service` | GPS for facility lookup |
| `@react-navigation/native` + `@react-navigation/stack` | Screen navigation |
| `zustand` | Lightweight state management |
| `react-native-share` | Share result card image |
| `react-native-permissions` | Camera + microphone + location permissions |

---

## SECTION 8: INFERENCE PIPELINE TIMING (Target on 3-4GB RAM Android)

| Step | Model | Expected Time |
|---|---|---|
| Image preprocessing | CPU | ~100ms |
| MobileNetV3 inference | TFLite INT8 | ~150ms |
| FAISS query | C++ JNI | ~300ms |
| Prompt building | JS | ~50ms |
| Gemma E2B INT4 inference | TFLite | ~2000ms |
| Response parsing | JS | ~50ms |
| **Total** | | **~2.7 seconds** |

---

## SECTION 9: FIRST-RUN SETUP (What Happens on First App Launch)

1. App detects first run via AsyncStorage flag
2. Copies `gemma4_e2b_int4.tflite` from APK assets → app internal storage
3. Copies `mobilenet_wasting.tflite` → app internal storage
4. Copies `ggml-base.bin` → app internal storage
5. Copies `rag.index` + `chunk_map.json` → app internal storage
6. Copies `facilities.db` → app internal storage
7. Initializes SQLite schema
8. Sets first-run flag
9. Navigates to LanguageSelectScreen

Total first-run copy time: ~15-30 seconds (shown as loading progress bar on SplashScreen).
All subsequent launches: ~3-5 seconds (models already in internal storage).

---

## SECTION 10: HACKATHON COMPLIANCE CHECKLIST

| Requirement | How Met |
|---|---|
| Gemma 4 model used centrally | Gemma 4 E2B INT4 = core inference engine |
| Intentional model selection justifiable | E2B = only model that fits 3-4GB RAM + offline + edge |
| Multimodal capability demonstrated | Camera (vision via CV) + voice (whisper) + text |
| Function calling demonstrated | PromptBuilder enforces structured JSON output (simulated function calling via constrained generation) |
| Runs offline | Zero internet after install. All models on device. |
| Health domain | Child malnutrition detection — explicit clinical application |
| Impact quantifiable | 42.8M wasting children, 3.1M annual deaths, zero privacy-safe offline alternatives |
| Reproducibility | README with 5-command setup. All models downloadable from HF + whisper.cpp releases. |
| Live demo (not faked) | App runs real inference on real device |
| Video storytelling | Show caregiver → photo → result in under 60 seconds |

---

## SECTION 11: README (5-Command Setup for Judges)

```bash
# 1. Clone and install
git clone https://github.com/yourrepo/earlyeyes && cd earlyeyes && npm install

# 2. Run pre-build scripts (Python — merges LoRA, builds FAISS index)
pip install -r scripts/requirements.txt && python scripts/build_all.py

# 3. Copy model assets to Android
npm run copy-assets

# 4. Build and install on connected Android device
npx react-native run-android

# 5. Open app — works fully offline from this point
```
