import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LANGUAGE_STORAGE_KEY = 'earlyeyes.language';

type LanguageContextValue = {
  language: string;
  isReady: boolean;
  setLanguage: (code: string) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const translations: Record<string, Record<string, string>> = {
  en: {
    select_language: 'Select Language',
    language_subtitle:
      'Choose your preferred language to continue. This can be changed later in settings.',
    continue: 'Continue',
    onboarding_title: 'How it works',
    onboarding_subtitle:
      "Three simple steps to monitor your child's health.",
    onboarding_step_1: 'Take a photo of your child',
    onboarding_step_2: 'We check for warning signs',
    onboarding_step_3: 'We tell you if you need a doctor',
    get_started: 'Get Started',
    splash_tagline: "Early warning for your child's health",
    splash_loading: 'Initializing models...',
    home_ready: 'Ready to check your child?',
    home_check_child: 'Check My Child',
    home_history: 'History',
    home_settings: 'Settings',
    input_title: 'Choose input method',
    input_photo_title: 'Take Photo',
    input_photo_desc: 'Capture a clear full-body image.',
    input_photo_button: 'Open Camera',
    input_voice_title: 'Describe by Voice',
    input_voice_desc: 'Record symptoms in your language.',
    input_voice_button: 'Start Voice Input',
    camera_preview: 'Camera preview placeholder',
    camera_help: 'Take a clear photo of your child.',
    camera_capture: 'Capture',
    voice_title: 'Describe symptoms by voice',
    voice_transcript_placeholder:
      'Transcript will appear here after recording.',
    voice_stop_analyze: 'Stop & Analyze',
    processing_title: 'Processing',
    processing_analyzing: 'Analyzing input…',
    processing_subtitle:
      'Checking health guidelines and preparing results.',
    processing_step_1: 'Analyzing photo',
    processing_step_2: 'Checking health guidelines',
    processing_step_3: 'Preparing your result',
    processing_view_result: 'View Result',
    result_title: 'Assessment Result',
    result_risk_title: 'Seek medical care now',
    result_risk_desc: 'Early signs of severe wasting were detected.',
    result_what_noticed: 'What we noticed',
    result_nearest_facility: 'Nearest facility',
    result_share: 'Share result',
    indicator_muscle_wasting: 'Visible muscle wasting',
    indicator_swollen_feet: 'Swollen feet',
    indicator_low_energy: 'Low energy',
    risk_urgent: 'Urgent: Seek medical care immediately',
    risk_monitor: 'Monitor: Follow-up recommended',
    risk_ok: 'No urgent issues detected',
    detected_via: 'Detected via:',
    possible_conditions: 'Possible Conditions',
    age_group: 'Age Group',
    muac_threshold: 'MUAC Threshold',
    visual_signs: 'Visual Signs',
    matched_symptoms: 'Matched Symptoms',
    what_noticed: 'What We Noticed',
    immediate_actions: 'What To Do Right Now',
    future_warnings: 'Warning Signs To Watch',
    no_conditions_found: 'No matching conditions found based on current inputs.',
    no_image_analysis: 'No image analysis was performed.',
    describe_symptoms_prompt: 'Describe symptoms using voice or text for guidance.',
    disclaimer: 'Disclaimer: EarlyEyes is a screening tool, not a diagnostic device. A clinical exam by a healthcare professional is strictly required to confirm any condition.',
    doctor_brief_title: "Doctor's Brief",
    history_title: 'History',
    history_monitor: 'Monitor closely',
    history_ok: 'No urgent signs',
    facility_title: 'Nearest Facilities',
    settings_title: 'Settings',
    settings_language: 'Language',
    settings_about_title: 'About EarlyEyes',
    settings_about_text:
      'EarlyEyes provides offline early warning guidance. It does not replace a doctor.',
    disclaimer_text: 'This is not a diagnosis. Only a doctor can confirm.',
  },
  ta: {},
  hi: {},
  bn: {},
  sw: {},
  ha: {},
  am: {},
  es: {},
  fr: {},
  ur: {},
};

export function t(language: string, key: string) {
  return translations[language]?.[key] ?? translations.en?.[key] ?? key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState('en');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (stored && isMounted) {
          setLanguageState(stored);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = async (code: string) => {
    setLanguageState(code);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  };

  const value = useMemo(
    () => ({ language, isReady, setLanguage }),
    [language, isReady],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}


export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
