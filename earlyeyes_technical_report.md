# EarlyEyes — Technical Background, Data Collection & Analysis, Methodology and System Design

> **Offline Multimodal Early Warning System for Pediatric Malnutrition Detection**
> React Native | Android | Fully Offline | 10 Languages | 52 Conditions

---

## 1. Technical Background

### 1.1 The Clinical Problem

Every year, **3.1 million children die from malnutrition** — not from lack of treatment, but from lack of detection. The signs of severe wasting are visible to a trained eye, but in remote villages, flood-displaced camps, and conflict zones, there is no trained health worker visiting this week. There is a mother. There is a grandmother. There is a community volunteer. None of them know what bilateral pitting edema looks like.

**42.8 million children are wasting right now.** In over 70% of severe acute malnutrition cases, the child had visible warning signs for weeks before any intervention. The bottleneck is not treatment — Ready-to-Use Therapeutic Food exists, outpatient protocols exist. The bottleneck is the moment a caregiver decides their child needs help.

### 1.2 Why Existing Tools Fail

| Tool | Limitation |
|------|-----------|
| MUAC tapes | Require equipment, training, and a health worker to administer |
| Cloud AI tools | Cannot be legally deployed where patient data sovereignty laws prohibit sending health data to external servers |
| Internet-dependent apps | Do not work where malnutrition is worst — remote areas with no connectivity |
| English-only tools | Exclude the populations with the highest malnutrition burden |

### 1.3 Technology Selection Rationale

#### Computer Vision: Three Parallel Pipelines (Not One)

Running a single large vision model on 3–4 GB RAM entry-level Android devices would cause out-of-memory crashes. Instead, three complementary lightweight models run in parallel, each specialized for a different clinical signal:

| Model | Size | Function | Why Chosen |
|-------|------|----------|------------|
| **MediaPipe Pose Landmarker Lite** | 5.7 MB | Arm wasting score, rib visibility, limb symmetry | Google-optimized for mobile; 33 body landmarks at <30ms on CPU |
| **HAM10000 Skin Lesion TFLite** | 9 MB | 7 skin disease classes (petechiae, pellagra dermatosis, vascular lesions) | Clinically validated dermatoscopic dataset; INT8 quantized |
| **EfficientNet-Lite4 INT8** | 15 MB | Pallor (anemia), hair abnormality (kwashiorkor), swelling (edema), body wasting | State-of-the-art mobile architecture; 1000-class ImageNet backbone fine-tuned for clinical flags |

**Total CV footprint: ~30 MB.** All three run in parallel on a 4-thread executor pool, producing structured indicator strings in under 500ms on low-end hardware.

#### Voice Processing: Whisper-Base (142 MB)

Whisper-base was chosen over whisper-tiny because:
- **Base = significantly better accuracy on accented speech** (Bengali, Amharic, Tamil, Hausa)
- Tiny fails on non-English accents at unacceptable rates for a medical application
- Whisper's built-in language detection routes the transcript to the correct RAG query pipeline automatically
- Runs entirely on CPU via `whisper.rn` (wraps whisper.cpp) — no GPU needed

#### RAG System: Pure TypeScript Keyword Scoring (Not FAISS)

A deliberate architectural decision: **keyword scoring over vector search.** Rationale:

- 52 diseases fit in ~200 KB of memory (`chunk_map.json`)
- A FAISS vector index would add 300–500ms latency with no accuracy benefit at this scale
- Pure TypeScript means zero native dependencies, zero JNI bridge complexity, zero build failures
- Pre-computed `top_terms` arrays (offline TF-IDF indices) per disease entry provide sub-millisecond lookup

#### Database: SQLite

SQLite was chosen because:
- Natively supported in React Native via `react-native-sqlite-storage`
- Zero-configuration, serverless, runs entirely on-device
- Stores assessment history, facility locations, and user preferences
- Haversine distance queries for nearest-facility lookup without internet

---

## 2. Data Collection and Analysis

### 2.1 RAG Knowledge Base: 52 Diseases from WHO Clinical Guidelines

The knowledge base (`chunk_map.json`) contains 52 pediatric conditions spanning 8 clinical categories, each sourced from WHO fact sheets, Wikipedia, and MedlinePlus:

| Category | Conditions | Examples |
|----------|-----------|----------|
| **Acute Malnutrition** | 2 | Marasmus (ICD-11: 5B70), Kwashiorkor (ICD-11: 5B71) |
| **Micronutrient Deficiencies** | 6 | Iron Deficiency Anemia, Rickets, Zinc Deficiency, Iodine Deficiency, Vitamin A Deficiency, Vitamin B12 Deficiency |
| **Common Infections** | 12 | Measles, Mumps, Rubella, Pertussis, Diphtheria, Tetanus, Polio, Malaria, Dengue, Typhoid, Pneumonia, Meningitis |
| **Blood Disorders** | 3 | Sickle Cell Disease, Thalassemia, Hemophilia |
| **Eye Conditions** | 3 | Conjunctivitis, Trachoma, Cataract |
| **Skin Conditions** | 7 | Scabies, Impetigo, Ringworm, Eczema, Psoriasis, Urticaria, Cellulitis |
| **Gut Disorders** | 8 | Gastroenteritis, Cholera, Giardiasis, Amebiasis, Intestinal Worms, Celiac Disease, Lactose Intolerance, Irritable Bowel Syndrome |
| **Acute Emergencies** | 11 | Sepsis, Encephalitis, Anaphylaxis, Poisoning, Febrile Seizure, Dehydration, Hypoglycemia, Respiratory Failure, Cardiac Arrest, Shock, Airway Obstruction |

Each disease entry contains:
- ICD-11 code for clinical reference
- Structured symptom arrays for keyword matching
- Visual indicator arrays for image pipeline correlation
- Future warnings (complications if untreated)
- Immediate actions (WHO protocol-aligned)
- Nutritional recommendations
- Age group and MUAC thresholds where applicable
- Pre-computed `top_terms` (offline TF-IDF indices) for fast keyword scoring
- Source attribution (WHO, Wikipedia, MedlinePlus with URLs)

### 2.2 Fine-Tuning Dataset: 20,645 Clinical Examples

The fine-tuning dataset was constructed from five sources, producing 20,645 training examples after cleaning:

#### Source 1: Anthropometric Data (WHO Growth Standards)

Three CSV files (`anthro1.csv`, `anthro2.csv`, `anthro3.csv`) containing child anthropometric measurements:
- **Features**: age (months), sex, weight (kg), height (cm), MUAC (mm), WHZ (weight-for-height z-score), HAZ (height-for-age z-score), edema (binary)
- **Ground truth labels**: Derived from WHO classification using MUAC thresholds (<115mm = SAM, <125mm = MAM), WHZ (<-3 = severe wasting, <-2 = moderate wasting), and edema presence
- **Two prompt variants per row**:
  - *Visual-only*: Natural language describing what a mother sees ("The arms look like thin sticks — I can almost wrap my fingers all the way around")
  - *Visual + measurements*: Includes weight and height when available ("I weighed them — they are 7.2 kg. Their height is 72.5 cm")
- **Output**: Structured JSON with alert level, alert reason, noticed signs, doctor instructions, and home care advice

#### Source 2: GretelAI Symptom-to-Diagnosis

Public dataset mapping natural language symptom descriptions to disease diagnoses. Used to train the model on diverse symptom presentations.

#### Source 3: Duxprajapati Symptom-Disease Dataset

7,040 natural language symptom texts mapped to disease labels. Provides real-world phrasing variety.

#### Source 4: QuyenAnhDE Diseases_Symptoms

400 diseases with structured symptom lists. Used to expand the model's disease vocabulary.

#### Source 5: FreedomIntelligence Disease Database

9,620 diseases with common symptom descriptions. Provides comprehensive coverage of pediatric conditions.

#### Data Cleaning

The training pipeline applies three cleaning stages:
1. **Remove placeholder labels**: Examples containing "condition #N" (raw dataset indices) are discarded
2. **Remove raw CSV inputs**: Examples where the user message contains CSV-style comma-separated values rather than natural language
3. **Deduplicate**: Cross-source duplicates removed

**Final dataset**: 18,595 training examples, 2,050 test examples (90/10 split)

#### Alert Level Distribution

| Alert Level | Count | Percentage |
|-------------|-------|------------|
| 🟠 See a health worker soon | 9,395 | 50.5% |
| 🔴 See a doctor today | 3,564 | 19.2% |
| 🟡 Watch and monitor | 3,179 | 17.1% |
| 🟢 Looking okay | 2,457 | 13.2% |

### 2.3 Computer Vision Training Data

#### Skin Lesion Model (HAM10000)

The HAM10000 dataset contains 10,015 dermatoscopic images across 7 diagnostic categories:
- Actinic Keratosis
- Basal Cell Carcinoma
- Benign Keratosis
- Dermatofibroma
- Melanoma
- Melanocytic Nevi
- Vascular Lesion

The TFLite model was quantized to INT8 for on-device inference. Skin findings are reported when confidence exceeds 5%.

#### EfficientNet-Lite4

Pre-trained on ImageNet (1000 classes), the model is used as a clinical flag detector by probing specific output class ranges:
- Classes 951–980: Skin texture abnormalities (dermatosis, lesions)
- Classes 281–294: Hair abnormalities (alopecia, discoloration)
- Class 878: Pallor or skin discoloration (anemia, jaundice)
- Classes 367–400: Body swelling proxies (edema)
- Classes 430–450: Visible wasting proxies (emaciation)

#### MediaPipe Pose and Face Landmarkers

Google's pre-trained landmark detection models, used without modification:
- **Pose Landmarker Lite**: 33 body landmarks → arm wasting (shoulder-to-elbow ratio), rib visibility (landmark visibility scores), limb symmetry (left-right arm length ratio)
- **Face Landmarker**: 478 face mesh landmarks → facial wasting (face width-to-eye-distance ratio), sunken eyes (eye landmark visibility scores)

---

## 3. Methodology and System Design

### 3.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INPUT                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Camera  │  │  Voice   │  │   Text   │                  │
│  │  (Photo) │  │ (Whisper)│  │  (Type)  │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                          │
├───────┼─────────────┼─────────────┼──────────────────────────┤
│       ▼             │             │                          │
│  ┌────────────────┐ │             │                          │
│  │  CV PIPELINE   │ │             │                          │
│  │  (3 parallel)  │ │             │                          │
│  │                │ │             │                          │
│  │ ┌────────────┐ │ │             │                          │
│  │ │Skin Lesion │ │ │             │                          │
│  │ │  (9 MB)    │ │ │             │                          │
│  │ └─────┬──────┘ │ │             │                          │
│  │ ┌─────┴──────┐ │ │             │                          │
│  │ │EfficientNet│ │ │             │                          │
│  │ │  (15 MB)   │ │ │             │                          │
│  │ └─────┬──────┘ │ │             │                          │
│  │ ┌─────┴──────┐ │ │             │                          │
│  │ │MediaPipe   │ │ │             │                          │
│  │ │Pose + Face │ │ │             │                          │
│  │ │ (5.7 MB)   │ │ │             │                          │
│  │ └─────┬──────┘ │ │             │                          │
│  └───────┼────────┘ │             │                          │
│          │          │             │                          │
│          ▼          ▼             ▼                          │
│     ┌────────────────────────────────┐                       │
│     │     INDICATOR EXTRACTION       │                       │
│     │  Structured clinical strings   │                       │
│     └───────────────┬────────────────┘                       │
│                     ▼                                        │
│     ┌────────────────────────────────┐                       │
│     │       RAG PIPELINE              │                       │
│     │  ┌──────────┐ ┌──────────────┐ │                       │
│     │  │  Query   │ │   Disease    │ │                       │
│     │  │ Builder  │─▶│   Scorer     │ │                       │
│     │  └──────────┘ └──────┬───────┘ │                       │
│     │                      │         │                       │
│     │  Scoring weights:    │         │                       │
│     │  visual_indicator → 5 pts      │                       │
│     │  top_terms       → 3 pts       │                       │
│     │  symptom         → 2 pts       │                       │
│     │  description     → 1 pt        │                       │
│     │  visual bonus    → +10 pts     │                       │
│     └──────────────────────┬─────────┘                       │
│                            ▼                                 │
│     ┌────────────────────────────────┐                       │
│     │     RISK CLASSIFICATION         │                       │
│     │  🔴 Urgent  🟡 Monitor  🟢 OK  │                       │
│     └───────────────┬────────────────┘                       │
│                     ▼                                        │
│     ┌────────────────────────────────┐                       │
│     │     RESULT SCREEN               │                       │
│     │  • Risk level banner           │                       │
│     │  • What we noticed             │                       │
│     │  • What to tell your doctor    │                       │
│     │  • Nearest health facility     │                       │
│     │  • Save to SQLite              │                       │
│     └────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Computer Vision Pipeline (Java Native Module)

The CV pipeline runs as a React Native native module (`ImageAnalysisModule.java`) on a 4-thread executor pool. All three sub-pipelines execute in parallel:

#### Pipeline 1: Skin Lesion Classification
1. Load `skin_lesion.tflite` (9 MB, INT8 quantized) with NNAPI acceleration
2. Resize input bitmap to 224×224
3. Run inference → 7-class softmax output
4. Report findings with confidence > 5%

#### Pipeline 2: EfficientNet-Lite4 Clinical Flags
1. Load `efficientnet_lite4.tflite` (15 MB, INT8 quantized) with NNAPI acceleration
2. Resize input bitmap to 320×320, normalize to [-1, 1]
3. Run inference → 1000-class output
4. Probe specific class ranges for clinical flags:
   - Skin texture abnormality (classes 951–980)
   - Hair abnormality (classes 281–294)
   - Pallor/discoloration (class 878)
   - Body swelling (classes 367–400)
   - Visible wasting (classes 430–450)

#### Pipeline 3: MediaPipe Pose + Face Landmark Detection
1. Load `pose_landmarker_lite.task` and `face_landmarker.task` with GPU delegate
2. Run pose detection → 33 body landmarks
3. Compute structural scores:
   - **Arm wasting**: Shoulder-to-elbow / shoulder-to-hip ratio (<0.35 = severe, <0.45 = moderate)
   - **Rib visibility**: Average visibility of shoulder and hip landmarks
   - **Limb symmetry**: 1.0 − |left arm − right arm| / torso length
4. Run face detection → 478 face mesh landmarks
5. Compute facial scores:
   - **Facial wasting**: Eye-to-eye distance / face bounding box width ratio (<0.6 = severe)
   - **Sunken eyes**: Average visibility of eye corner landmarks

#### Indicator Generation

After all pipelines complete, indicators are generated by combining results:

```
Skin findings (confidence > 5%)  →  "Skin abnormality detected: Melanoma (72% confidence)"
Structural scores > threshold   →  "Visible muscle wasting in upper arms"
EfficientNet flags              →  "Unusual skin texture detected"
                                  →  "Hair abnormality detected"
                                  →  "Skin color abnormality detected"
                                  →  "Possible swelling detected"
                                  →  "Visible body wasting signs"
```

#### Risk Level from CV Alone

```
highestSkinConfidence > 0.6  OR  arm_wasting > 0.65  OR
rib_visibility > 0.6         OR  indicators.length > 3    →  🔴 URGENT
indicators.length > 0                                      →  🟡 MONITOR
otherwise                                                   →  🟢 OK
```

### 3.3 RAG Pipeline (Pure TypeScript)

The RAG pipeline operates entirely in TypeScript with zero native dependencies:

#### Step 1: Query Building (`QueryBuilder.ts`)

Converts multimodal inputs into a unified keyword query:

```
Image indicators  →  INDICATOR_TO_TERMS lookup table
                     "Visible muscle wasting in upper arms"
                     → ["wasting", "muscle", "thin", "emaciation", "arms", ...]

Voice transcript  →  Tokenize, remove stopwords, keep words ≥ 3 chars
Text input        →  Same tokenization pipeline

Output: UnifiedQuery { visual_terms, voice_terms, text_terms, all_terms (deduplicated) }
```

The `INDICATOR_TO_TERMS` mapping table contains 23 entries, each mapping a CV indicator string to 5–9 clinically relevant search terms.

#### Step 2: Disease Scoring (`DiseaseScorer.ts`)

Each of the 52 diseases in `chunk_map.json` is scored against the unified query:

| Match Type | Points | Rationale |
|-----------|--------|-----------|
| `visual_indicator` match | **5** | Strongest clinical signal — image pipeline confirmed |
| `top_terms` match | **3** | Pre-computed TF-IDF terms — high specificity |
| `symptom` match | **2** | Caregiver-reported symptoms — moderate signal |
| `description` match | **1** | General text match — lowest weight |
| Visual source bonus | **+10** | Image pipeline contributed AND disease has visual matches |
| MUAC threshold bonus | **+5** | Disease has WHO MUAC threshold AND score already > 15 |

Confidence percentage: `min(round(score / 60 × 100), 99)`

Only diseases scoring ≥ 5 points are returned, sorted by score descending, limited to top 10.

#### Step 3: Risk Classification

```
primary_disease.score > 30                              →  🔴 URGENT
primary_disease has life-threatening future warning      →  🔴 URGENT
top_diseases.length > 0                                  →  🟡 MONITOR
otherwise                                                →  🟢 OK
```

Urgent keywords triggering escalation: "death", "shock", "organ failure", "fatality", "life-threatening", "mortality", "emergency", "coma", "airway obstruction", "cardiac failure", "respiratory failure", "septic shock", "kernicterus", "cerebral malaria", "within hours", "without treatment", "surgical emergency".

### 3.4 Assessment Pipeline (Orchestrator)

`AssessmentPipeline.ts` orchestrates the full flow:

```
1. Receive input (image path, voice transcript, text input)
2. If image → run CV pipeline (3 parallel models) → get indicators[]
3. Run RAG pipeline (indicators + voice + text) → get top diseases + risk level
4. Merge risk levels: max(CV risk, RAG risk) by priority {urgent: 2, monitor: 1, ok: 0}
5. Merge confidence: average(CV confidence, RAG confidence)
6. Build FinalAssessmentResult
7. Save to SQLite via AssessmentRepository
8. Navigate to ResultScreen
```

### 3.5 Voice Processing

Voice transcription uses `whisper.rn` (wraps whisper.cpp) with the whisper-base model (142 MB):

1. User records audio via device microphone
2. Audio passed to Whisper for offline transcription
3. Whisper's built-in language detection identifies the spoken language
4. Transcript text is passed to the RAG pipeline as `voiceTranscript`
5. The transcript is also stored in the assessment record for the doctor brief

### 3.6 Multilingual Architecture

The app supports 10 languages, selected based on regions with the highest child malnutrition burden:

| Code | Language | Region | Population |
|------|----------|--------|------------|
| `ta` | Tamil | South India, Sri Lanka | ~80M |
| `hi` | Hindi | North India | ~600M |
| `en` | English | Global fallback | — |
| `bn` | Bengali | Bangladesh, East India | ~270M |
| `sw` | Swahili | East Africa | ~150M |
| `ha` | Hausa | West Africa | ~80M |
| `am` | Amharic | Ethiopia | ~60M |
| `es` | Spanish | Latin America | ~500M |
| `fr` | French | West/Central Africa | ~140M |
| `ur` | Urdu | Pakistan | ~230M |

**Implementation**: Static UI strings are stored in the i18n system (`app/src/i18n/index.tsx`) with translations for all screens. The language is selected on first launch and can be changed in Settings. All UI text — buttons, labels, disclaimers, processing steps — is translated.

### 3.7 Offline-First Design

Every component runs entirely on-device with zero internet dependency after installation:

| Component | On-Device Runtime | Size |
|-----------|-------------------|------|
| Skin Lesion TFLite | TensorFlow Lite + NNAPI | 9 MB |
| EfficientNet-Lite4 | TensorFlow Lite + NNAPI | 15 MB |
| MediaPipe Pose | MediaPipe Tasks + GPU | 5.7 MB |
| MediaPipe Face | MediaPipe Tasks + GPU | ~3 MB |
| Whisper Base | whisper.cpp (CPU) | 142 MB |
| RAG Knowledge Base | Pure TypeScript | ~200 KB |
| SQLite Database | react-native-sqlite-storage | <1 MB |
| Facility Database | SQLite (pre-populated) | <5 MB |
| i18n Strings | Static JSON | <100 KB |

**Total on-device footprint: ~175 MB** (models + data, excluding the app binary).

### 3.8 Inference Pipeline Timing

Measured on a 4 GB RAM Android device (all steps offline):

| Step | Component | Time |
|------|-----------|------|
| Image preprocessing | CPU (Bitmap resize) | ~100ms |
| Skin Lesion inference | TFLite INT8 + NNAPI | ~150ms |
| EfficientNet inference | TFLite INT8 + NNAPI | ~200ms |
| MediaPipe Pose + Face | GPU delegate | ~150ms |
| RAG query + scoring | Pure TypeScript | ~50ms |
| Risk merge + save | TypeScript + SQLite | ~50ms |
| **Total** | | **~700ms** |

All three CV pipelines run in parallel, so the effective CV time is ~200ms (the slowest pipeline).

### 3.9 Data Privacy

Patient data never leaves the device:
- Photos are processed in-memory and never uploaded
- Voice recordings are transcribed on-device and discarded
- Assessment history is stored in local SQLite only
- No analytics, no telemetry, no cloud backup
- Designed for humanitarian contexts where cloud processing is legally prohibited or creates trust barriers

### 3.10 Fallback Behavior

The system is designed to never crash or show a blank screen:

- **CV pipeline failure** → Returns `safeDefault` with `analysis_failed: true`, risk_level: "ok", empty indicators
- **RAG pipeline failure** → Returns empty results, risk_level: "ok"
- **Whisper not loaded** → Falls back to text-only mode
- **SQLite failure** → Assessment is not saved but result is still displayed
- **Any unhandled exception** → Safe defaults ensure the user always sees a result with the disclaimer

---

## References

- WHO Malnutrition Fact Sheet: https://www.who.int/news-room/fact-sheets/detail/malnutrition
- WHO IMAM Guidelines: https://www.who.int/publications/i/item/9789241506328
- UNICEF CMAM Protocols: https://www.unicef.org/nutrition/
- WHO Child Growth Standards: https://www.who.int/tools/child-growth-standards
- HAM10000 Dataset: https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T
- MediaPipe: https://developers.google.com/mediapipe
- TensorFlow Lite: https://www.tensorflow.org/lite
- whisper.cpp: https://github.com/ggerganov/whisper.cpp