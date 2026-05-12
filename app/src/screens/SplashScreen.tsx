import React, { useEffect } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function SplashScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const progress = 0.6;

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('LanguageSelect');
    }, 1800);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCard}>
          <Image
            source={require('../../assets/images/earlyeyes-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.subtitle}>Early warning for your child&apos;s health</Text>
      </View>
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>Initializing models...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  content: {
    marginTop: 110,
    alignItems: 'center',
  },
  logoCard: {
    width: 170,
    height: 170,
    borderRadius: 28,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 130,
    height: 90,
  },
  subtitle: {
    marginTop: 32,
    fontSize: 20,
    color: '#1D4F91',
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 28,
  },
  progressSection: {
    paddingBottom: 32,
    gap: 12,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1D4F91',
    borderRadius: 999,
  },
  progressLabel: {
    textAlign: 'center',
    color: '#616161',
    fontSize: 13,
  },
});
