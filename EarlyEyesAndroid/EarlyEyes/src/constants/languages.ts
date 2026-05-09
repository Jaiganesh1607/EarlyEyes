export type LanguageOption = {
  code: string;
  label: string;
  nativeLabel: string;
};

export const languages: LanguageOption[] = [
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'sw', label: 'Swahili', nativeLabel: 'Kiswahili' },
  { code: 'ha', label: 'Hausa', nativeLabel: 'Hausa' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
];
