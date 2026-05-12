import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LanguagePicker from '../components/LanguagePicker';
import { languages } from '../constants/languages';
import { t, useLanguage } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function LanguageSelectScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { language, setLanguage, isReady } = useLanguage();
  const [selectedCode, setSelectedCode] = useState(language);

  useEffect(() => {
    if (isReady) {
      setSelectedCode(language);
    }
  }, [isReady, language]);

  const selectedLanguage =
    languages.find((item) => item.code === selectedCode) ?? languages[2];

  const handleContinue = async () => {
    if (!selectedLanguage) {
      return;
    }
    await setLanguage(selectedLanguage.code);
    navigation.navigate('Onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.brand}>EarlyEyes</Text>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>Aa</Text>
        </View>
        <Text style={styles.title}>{t(selectedCode, 'select_language')}</Text>
        <Text style={styles.subtitle}>
          {t(selectedCode, 'language_subtitle')}
        </Text>
      </View>
      <LanguagePicker
        selectedCode={selectedCode}
        onSelect={(item) => setSelectedCode(item.code)}
      />
      <Pressable
        onPress={handleContinue}
        disabled={!selectedLanguage}
        style={({ pressed }) => [
          styles.continueButton,
          pressed && styles.continuePressed,
          !selectedLanguage && styles.continueDisabled,
        ]}
      >
        <Text style={styles.continueText}>{t(selectedCode, 'continue')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F6F3F1',
  },
  brand: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#1D74C9',
    marginBottom: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1D74C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E1E1E',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#5C6670',
    textAlign: 'center',
    maxWidth: 270,
    lineHeight: 18,
  },
  continueButton: {
    marginTop: 16,
    backgroundColor: '#1D74C9',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continuePressed: {
    opacity: 0.9,
  },
  continueDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
