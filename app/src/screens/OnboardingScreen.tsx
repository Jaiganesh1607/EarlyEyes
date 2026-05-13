import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t, useLanguage } from '../i18n';
import { RootStackParamList } from '../navigation/AppNavigator';

const ONBOARDING_STORAGE_KEY = 'earlyeyes.onboarding_seen';

export default function OnboardingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { language } = useLanguage();

  const steps = [
    { icon: 'camera-plus-outline', text: t(language, 'onboarding_step_1') },
    { icon: 'shield-check-outline', text: t(language, 'onboarding_step_2') },
    { icon: 'medical-bag', text: t(language, 'onboarding_step_3') },
  ];

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/earlyeyes-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>EarlyEyes</Text>
      </View>

      <View style={styles.hero}>
        <Image
          source={require('../../assets/images/onboard-image.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      <Text style={styles.title}>{t(language, 'onboarding_title')}</Text>
      <Text style={styles.subtitle}>{t(language, 'onboarding_subtitle')}</Text>

      {steps.map((step, index) => (
        <View style={styles.stepCard} key={step.icon + index}>
          <View style={styles.stepIcon}>
            <Icon name={step.icon} size={22} color="#0F5FAE" />
          </View>
          <Text style={styles.stepText}>{step.text}</Text>
        </View>
      ))}

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
  logo: {
    width: 34,
    height: 34,
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
  heroImage: {
    height: 180,
    borderRadius: 20,
    width: '100%',
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
    backgroundColor: '#EAF2FB',
    alignItems: 'center',
    justifyContent: 'center',
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
