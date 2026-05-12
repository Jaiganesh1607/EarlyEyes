import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function ProcessingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = route.params as RootStackParamList['Processing'] | undefined;
  const [progress, setProgress] = useState(0.65);
  const [stepIndex, setStepIndex] = useState(1);

  const inputLabel = useMemo(() => {
    if (params?.photoUri) {
      return 'photo';
    }
    if (params?.audioUri) {
      return 'audio';
    }
    return 'text';
  }, [params?.audioUri, params?.photoUri]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Result');
    }, 1800);

    return () => clearTimeout(timer);
  }, [navigation]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((value) => {
        const next = Math.min(1, value + 0.05);
        if (next >= 0.35) {
          setStepIndex(1);
        }
        if (next >= 0.7) {
          setStepIndex(2);
        }
        if (next >= 0.95) {
          setStepIndex(3);
        }
        return next;
      });
    }, 420);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandBlock}>
        <View style={styles.brandBadge}>
          <Icon name="shield-check" size={22} color="#0E5FB3" />
        </View>
        <Text style={styles.brand}>EarlyEyes</Text>
        <Text style={styles.subtitle}>Analysis in Progress</Text>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>SCANNING</Text>
          <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.stepList}>
          <View style={[styles.stepRow, stepIndex >= 1 && styles.stepRowActive]}>
            <View style={[styles.stepIcon, styles.stepIconComplete]}>
              <Icon name="check" size={16} color="#0F5132" />
            </View>
            <Text style={styles.stepText}>Analyzing {inputLabel}...</Text>
          </View>

          <View style={[styles.stepRow, stepIndex >= 2 && styles.stepRowActive]}> 
            <View style={[styles.stepIcon, styles.stepIconCurrent]}>
              <Icon name="timer-sand" size={16} color="#1D4ED8" />
            </View>
            <Text style={[styles.stepText, styles.stepTextEmphasis]}>
              Checking health guidelines...
            </Text>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepIcon, styles.stepIconIdle]}>
              <Icon name="checkbox-blank-circle-outline" size={16} color="#9CA3AF" />
            </View>
            <Text style={styles.stepTextMuted}>Preparing your result...</Text>
          </View>
        </View>

        <View style={styles.etaRow}>
          <Text style={styles.etaLabel}>Estimated wait time</Text>
          <View style={styles.etaValue}>
            <Icon name="timer-outline" size={16} color="#1F2937" />
            <Text style={styles.etaText}>~12 sec</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Icon name="close" size={18} color="#374151" />
        <Text style={styles.cancelText}>Cancel Scan</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5F7FB',
    justifyContent: 'space-between',
  },
  brandBlock: {
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  brandBadge: {
    width: 78,
    height: 78,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    backgroundColor: '#F7FAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0E5FB3',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4B5563',
  },
  progressCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0E5FB3',
    letterSpacing: 1,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0E5FB3',
    borderRadius: 999,
  },
  stepList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
  },
  stepRowActive: {
    backgroundColor: '#E0EAFF',
    borderWidth: 1,
    borderColor: '#B6CCFF',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  stepIconComplete: {
    backgroundColor: '#D1F3DA',
  },
  stepIconCurrent: {
    backgroundColor: '#DCE7FF',
  },
  stepIconIdle: {
    backgroundColor: '#F3F4F6',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  stepTextEmphasis: {
    color: '#1D4ED8',
  },
  stepTextMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3EEEC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  etaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  etaValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    paddingVertical: 14,
    marginTop: 18,
    backgroundColor: '#F7F7F8',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
});
