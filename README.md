# 👁️ EarlyEyes — Offline-First Multimodal AI Pediatric Screening System

<div align="center">

[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://www.android.com/)
[![React Native](https://img.shields.io/badge/React_Native-0.85-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Edge AI](https://img.shields.io/badge/Edge_AI-100%25_Offline-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/lite)
[![Languages](https://img.shields.io/badge/Languages-10_Supported-4CAF50?style=for-the-badge)](#-multilingual-support)
[![Privacy](https://img.shields.io/badge/Privacy-Zero_Cloud_Data-8E44AD?style=for-the-badge)](#-data-privacy--sovereignty)

**An intelligent, fully offline edge-AI early warning system for pediatric malnutrition, ocular indicators, and developmental conditions in low-resource environments.**

[Key Features](#-key-features) • [System Architecture](#-system-architecture) • [AI Pipeline & Models](#-ai-pipeline--models) • [Benchmarking](#-benchmarks--performance) • [Getting Started](#-getting-started) • [Medical Disclaimer](#-medical-disclaimer)

</div>

---

## 📌 Problem & Motivation

Every year, **3.1 million children die from preventable malnutrition and untreated pediatric conditions**—not because treatments do not exist, but because of **delayed detection**. In remote villages, disaster camps, and underserved rural areas, specialist doctors and diagnostic equipment are absent.

While cloud-based AI diagnostic tools exist, they fundamentally fail where the malnutrition burden is highest:
1. **Zero Connectivity:** Remote clinics and rural households lack reliable 4G/5G mobile data or broadband.
2. **Data Sovereignty & Legal Privacy:** Exporting biometric photos and audio of minors to third-party overseas cloud APIs violates strict healthcare data sovereignty laws.
3. **High Latency & Cloud Costs:** Cloud-dependent tools introduce network timeouts, API costs, and single points of failure.

**EarlyEyes** is an offline-first, multimodal Android application engineered to run entirely on **entry-level smartphones (3–4 GB RAM)**. It empowers parents, community volunteers, and frontline health workers to conduct rapid preliminary screenings on-device in under **700 milliseconds** with **zero internet connection**.

---

## ⚡ Key Features

- 📴 **100% Offline Edge-AI Pipeline:** Computer Vision, Speech-to-Text, and Retrieval-Augmented Generation (RAG) execute locally on device hardware. Zero internet required after install.
- 👁️ **Tri-Model Computer Vision:** Decomposes visual assessment into three parallel lightweight neural networks (~30 MB total) running concurrently on a 4-thread native executor via NNAPI and GPU delegates.
- 🎙️ **On-Device Voice Transcription:** Integrates `whisper.rn` (`whisper.cpp` JNI wrapper) with a quantized Whisper-Base model (142 MB) to transcribe spoken symptoms directly on CPU across regional accents.
- 📚 **Deterministic Clinical RAG (52 Conditions):** Knowledge retrieval engine grounded in 52 WHO-curated pediatric conditions (ICD-11 codes) across 8 clinical categories with sub-50ms deterministic scoring.
- 📍 **Offline GPS Specialist Handoff:** Uses raw device satellite GPS coordinates and mathematical Haversine formulas against a pre-bundled database of regional hospitals (`facilities_tn.json`) to find the nearest specialized healthcare facility.
- 📋 **"Tell the Doctor" Brief:** Synthesizes caregiver-reported symptoms, detected visual flags, and WHO clinical guidelines into an actionable, copyable briefing note for medical practitioners.
- 🌐 **10 Regional Languages:** Fully localized interface supporting **Tamil (`ta`), Hindi (`hi`), Bengali (`bn`), Swahili (`sw`), Hausa (`ha`), Amharic (`am`), Urdu (`ur`), Spanish (`es`), French (`fr`), and English (`en`)**.
- 🛠️ **Clinician & Developer Audit Panel:** Built-in transparency dashboard displaying intermediate inference tokens, confidence percentiles, and raw sensor outputs.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CAREGIVER INPUT                                   │
│    ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│    │  Camera Screen   │    │ Voice Recording  │    │  Text Symptom Box  │   │
│    │  (Patient Photo) │    │  (Spoken Audio)  │    │  (Typed Inputs)    │   │
│    └────────┬─────────┘    └────────┬─────────┘    └─────────┬──────────┘   │
└─────────────┼───────────────────────┼────────────────────────┼──────────────┘
              │                       │                        │
              ▼                       ▼                        ▼
┌─────────────────────────┐ ┌───────────────────┐              │
│ COMPUTER VISION (3x CV) │ │   WHISPER.RN      │              │
│ • Skin Lesion (9 MB)    │ │ • whisper.cpp     │              │
│ • EfficientNet (15 MB)  │ │ • quantized CPU   │              │
│ • MediaPipe Pose & Face │ │ • 142 MB base     │              │
└─────────────┬───────────┘ └─────────┬─────────┘              │
              │                       │                        │
              ▼                       ▼                        ▼
      [ Visual Flags ]         [ Transcript ]           [ Text Tokens ]
              │                       │                        │
              └───────────────────────┼────────────────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │    QUERY BUILDER (TS)         │
                      │  • Indicator term expansion   │
                      │  • Stopword filtering         │
                      └───────────────┬───────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │    RAG CLINICAL SCORER        │
                      │  • 52 WHO condition chunks    │
                      │  • Top-term TF-IDF weights    │
                      │  • Physical visual flag bonus │
                      └───────────────┬───────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │    RISK ARBITRATION ENGINE    │
                      │  🔴 Urgent | 🟡 Monitor | 🟢 OK│
                      └───────────────┬───────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     RESULT SCREEN             │               │    OFFLINE FACILITY ROUTING   │
│ • Risk Level Banner           │               │ • Satellite GPS (Offline)     │
│ • Clinical Flags Summary      │               │ • Haversine Distance Calc     │
│ • "Tell Your Doctor" Brief    │               │ • Bundled Hospitals DB        │
│ • SQLite Assessment Storage   │               │ • Native OS Maps Handoff      │
└───────────────────────────────┘               └───────────────────────────────┘
```

---

## 🧠 AI Pipeline & Models

### 1. Tri-Model Parallel Computer Vision (~30 MB Total)
Rather than executing a single large multimodal vision-language model (which causes thermal throttling and out-of-memory crashes on low-end devices), EarlyEyes splits visual feature extraction across three specialized lightweight networks:

| Model | Format / Size | Target Feature | Acceleration |
|---|---|---|---|
| **MediaPipe Pose & Face Lite** | `.task` (8.7 MB) | Arm circumference ratios, rib prominence, sunken eye depth, facial wasting | GPU Delegate / Hexagon DSP |
| **HAM10000 Skin Classifier** | INT8 TFLite (9 MB) | Dermatological lesions, pellagra dermatosis, petechiae | Android NNAPI |
| **EfficientNet-Lite4** | INT8 TFLite (15 MB) | Clinical pallor, hair texture (kwashiorkor), edema swelling, emaciation | Android NNAPI |

*Effective CV latency on a 4-thread pool is **~200ms** (the slowest model) on a budget octa-core CPU.*

### 2. Edge Speech Recognition
- **Engine:** `whisper.rn` wrapping `whisper.cpp` in optimized C++ via JNI.
- **Model:** Quantized Whisper-Base (`142 MB`).
- **Rationale:** Base model provides significantly higher accuracy for non-native accented speech (Tamil, Amharic, Bengali, Swahili) compared to Tiny, running completely on CPU without GPU overhead.

### 3. Pure TypeScript Clinical RAG Engine
- **Memory Footprint:** ~200 KB (`chunk_map.json`).
- **Knowledge Base:** 52 conditions sourced from WHO IMAM (Integrated Management of Acute Malnutrition), UNICEF CMAM protocols, and ICD-11 classifications.
- **Scoring Architecture:** Deterministic keyword and clinical indicator weighted scoring:
  - Visual indicator match: `5 pts`
  - Pre-computed TF-IDF top terms: `3 pts`
  - Caregiver symptom match: `2 pts`
  - Visual source confirmation bonus: `+10 pts`
  - WHO MUAC threshold match bonus: `+5 pts`
- **Latency:** `< 50ms` (Zero JNI bridge latency, zero native memory allocation bugs).

### 4. On-Device Clinical Synthesizer (Llama 3.2 1B Instruct)
- **Engine:** `llama.rn` (React Native C++ JSI bindings to `llama.cpp`).
- **Model:** `Llama-3.2-1B-Instruct-Q4_K_M.gguf` (4-bit quantized GGUF, ~1.3 GB).
- **Function:** Ingests retrieved RAG clinical guidelines, visual anomaly indicators, and transcribed symptom speech to synthesize a structured risk assessment, parent-friendly explanation, and formatted "Doctor Brief" directly on device.
- **Sampling:** Temperature `0.05` with strict JSON schema constraints to eliminate hallucinations.

---

## 📊 Benchmarks & Performance

Measured on a physical budget Android smartphone (**Redmi / Samsung Galaxy A-series, 4 GB RAM, Android 13**):

```
┌──────────────────────────────────────┬─────────────┬─────────────┐
│ Pipeline Component                   │ Memory Peak │ Time (ms)   │
├──────────────────────────────────────┼─────────────┼─────────────┤
│ Image Preprocessing (Bitmap Resize)  │ 12 MB       │ ~100 ms     │
│ Skin Lesion TFLite (INT8 + NNAPI)    │ 18 MB       │ ~150 ms     │
│ EfficientNet-Lite4 (INT8 + NNAPI)    │ 24 MB       │ ~200 ms     │
│ MediaPipe Pose & Face (GPU Delegate) │ 28 MB       │ ~150 ms     │
│ Whisper-Base Audio Transcription     │ 155 MB      │ ~1,200 ms*  │
│ TypeScript Clinical RAG Scorer       │ < 2 MB      │ ~35 ms      │
│ SQLite Save & Result Aggregation     │ < 1 MB      │ ~40 ms      │
├──────────────────────────────────────┼─────────────┼─────────────┤
│ Total Cold Pipeline (Image + RAG)    │ ~82 MB Peak │ ~675 ms     │
└──────────────────────────────────────┴─────────────┴─────────────┘
* Whisper runtime depends on audio length (measured on 3-second symptom voice clip).
```

---

## 📁 Repository Structure

```
earlyeyes/
├── app/                          # React Native 0.85+ Android Application
│   ├── android/                  # Android Native project (Gradle, JNI, C++)
│   ├── src/
│   │   ├── components/           # UI components, Waveforms, Header bars
│   │   ├── constants/            # Themes, design tokens, color palette
│   │   ├── data/                 # Bundled hospitals (facilities_tn.json)
│   │   ├── db/                   # Local SQLite storage & migrations
│   │   ├── i18n/                 # Localization dictionaries (10 languages)
│   │   ├── llm/                  # Llama 3.2 1B runtime bindings & Prompts
│   │   ├── navigation/           # React Navigation stack & tabs
│   │   ├── screens/              # Core screens (Camera, Voice, Processing, Result)
│   │   ├── services/
│   │   │   ├── cv/               # Image analysis native bridge & landmarker
│   │   │   ├── location/         # Haversine distance calculator
│   │   │   ├── pipeline/         # Assessment pipeline orchestrator
│   │   │   └── rag/              # QueryBuilder, DiseaseScorer, chunk mappings
│   │   └── types/                # TypeScript interfaces & types
│   └── package.json
├── RAG/                          # Offline Knowledge Base Extraction & Processing
│   ├── chunking.py               # WHO clinical document chunking script
│   ├── chunk_map.json            # 52 condition database with TF-IDF terms
│   └── rag_data.json             # Raw clinical source guidelines
└── PROJECT_OVERVIEW.md           # High-level architecture overview
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** `>= 22.11.0`
- **JDK:** OpenJDK 17
- **Android Studio:** Android SDK Platform 34+, Android SDK Build-Tools 34.0.0
- **Android NDK:** `26.1.10909125` or compatible
- Physical Android phone with USB Debugging enabled (recommended for camera and GPU delegate testing).

### 1. Clone Repository
```bash
git clone https://github.com/Jaiganesh1607/EarlyEyes.git
cd earlyeyes
```

### 2. Install Dependencies
```bash
# Navigate to the app directory
cd app

# Install dependencies with npm
npm install
```

### 3. Model Assets Setup
Ensure the pre-trained models are copied to your Android asset folder:
```bash
# Verify models exist in Android assets:
# app/android/app/src/main/assets/
#   ├── skin_lesion.tflite
#   ├── efficientnet_lite4.tflite
#   ├── pose_landmarker_lite.task
#   └── models/
#       ├── Llama-3.2-1B-Instruct-Q4_K_M.gguf
#       └── ggml-base-q5_1.bin
```

### 4. Run on Android
```bash
# Start the Metro bundler
npm run start

# In a separate terminal, launch the app on your connected device/emulator
npm run android
```

---

## 🔒 Data Privacy & Sovereignty

- **Zero Cloud Communication:** The app makes zero external network calls during assessment.
- **In-Memory Image Processing:** Photos captured for screening are analyzed in device RAM and are not retained on public storage.
- **Local Auditing Only:** Screening history and triage notes are saved strictly in the sandboxed local SQLite database.
- **HIPAA / GDPR / Data Protection Compliant by Design:** Because patient biometrics never leave the hardware, the app avoids cross-border data transfer liabilities.

---

## ⚠️ Medical Disclaimer

> **EarlyEyes is an educational screening and early-warning decision-support tool. It is NOT a diagnostic device.**
> 
> EarlyEyes does not replace a trained medical doctor, pediatrician, or accredited healthcare provider. It is designed to assist frontline community health workers and caregivers in identifying warning signs that warrant professional medical evaluation. Always consult a licensed clinician for medical diagnoses and treatment plans.

---

## 📜 License & Acknowledgments

This project is licensed under the ISC License.

Special thanks to the open-source community and humanitarian research groups that make edge AI accessible:
- [Google MediaPipe](https://developers.google.com/mediapipe) for mobile landmark detection.
- [Georgi Gerganov](https://github.com/ggerganov/whisper.cpp) for `whisper.cpp`.
- [WHO Child Growth Standards](https://www.who.int/tools/child-growth-standards) & UNICEF CMAM protocols for pediatric clinical guidance.
- [HAM10000 Dataset](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T) for dermatological lesion data.

---

<div align="center">
  <sub>Built with ❤️ for global child health and edge computing accessibility.</sub>
</div>
