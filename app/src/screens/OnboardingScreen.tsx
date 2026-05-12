import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { t, useLanguage } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';

const ONBOARDING_STORAGE_KEY = 'earlyeyes.onboarding_seen';

export default function OnboardingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { language } = useLanguage();

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandMark}>
          <View style={styles.brandShield} />
        </View>
        <Text style={styles.brandText}>EarlyEyes</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroPlaceholder} />
      </View>

      <Text style={styles.title}>{t(language, 'onboarding_title')}</Text>
      <Text style={styles.subtitle}>{t(language, 'onboarding_subtitle')}</Text>

      <View style={styles.stepCard}>
        <View style={styles.stepIcon}>
          <Text style={styles.stepIconText}>CAM</Text>
        </View>
        <Text style={styles.stepText}>{t(language, 'onboarding_step_1')}</Text>
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepIcon}>
          <Text style={styles.stepIconText}>CHK</Text>
        </View>
        <Text style={styles.stepText}>{t(language, 'onboarding_step_2')}</Text>
      </View>
      <View style={styles.stepCard}>
        <View style={styles.stepIcon}>
          <Text style={styles.stepIconText}>DOC</Text>
        </View>
        <Text style={styles.stepText}>{t(language, 'onboarding_step_3')}</Text>
      </View>

      <Pressable
        onPress={handleGetStarted}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryPressed,
        ]}
      >
        <Text style={styles.primaryText}>{t(language, 'get_started')}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D74C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandShield: {
    width: 16,
    height: 18,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D74C9',
  },
  hero: {
    marginTop: 8,
    marginBottom: 16,
  },
  heroPlaceholder: {
    height: 180,
    borderRadius: 20,
    backgroundColor: '#DCE7F4',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E1E1E',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E1E5EA',
    marginBottom: 12,
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D7E7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D74C9',
  },
  stepText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E1E',
    flex: 1,
  },
  primaryButton: {
    marginTop: 'auto',
    backgroundColor: '#0F5FAE',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryPressed: {
    opacity: 0.9,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
