import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AudioRecord from 'react-native-audio-record';
import VoiceWaveform from '../components/VoiceWaveform';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function VoiceInputScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isRecording, setIsRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(true);

  const requestRecordPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Allow EarlyEyes to record audio for symptom descriptions.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

  const startRecording = useCallback(async () => {
    AudioRecord.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(async () => {
    const result = await AudioRecord.stop();
    setIsRecording(false);
    return result as string;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const granted = await requestRecordPermission();
      if (!isMounted) {
        return;
      }
      setPermissionGranted(granted);
      if (granted) {
        AudioRecord.init({
          sampleRate: 16000,
          channels: 1,
          bitsPerSample: 16,
          wavFile: 'earlyeyes_recording.wav',
          audioSource: 6,
        });
        await startRecording();
      }
    };

    init();

    return () => {
      isMounted = false;
      AudioRecord.stop();
    };
  }, [requestRecordPermission, startRecording]);

  const handleToggleRecording = useCallback(async () => {
    if (!permissionGranted) {
      return;
    }
    if (isRecording) {
      const audioPath = await stopRecording();
      navigation.navigate('InputMethod', { audioUri: audioPath });
      return;
    }
    await startRecording();
  }, [isRecording, navigation, permissionGranted, startRecording, stopRecording]);

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Icon name="close" size={22} color="#4B5563" />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.title}>Describe the Symptoms</Text>

        <View style={[styles.statusPill, !isRecording && styles.statusPillIdle]}>
          <View style={[styles.statusDot, !isRecording && styles.statusDotIdle]} />
          <Text style={[styles.statusText, !isRecording && styles.statusTextIdle]}>
            {permissionGranted ? (isRecording ? 'RECORDING LIVE' : 'PAUSED') : 'MIC PERMISSION REQUIRED'}
          </Text>
        </View>

        <VoiceWaveform isActive={isRecording} />

        <Pressable
          style={styles.micButton}
          onPress={handleToggleRecording}
          disabled={!permissionGranted}
        >
          <Icon name="microphone" size={36} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.tapText}>
          {permissionGranted ? (isRecording ? 'Tap to stop' : 'Tap to resume') : 'Enable microphone access'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F8F5F3',
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECE9E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1A19',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FBD6CF',
  },
  statusPillIdle: {
    backgroundColor: '#E5E7EB',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C62828',
  },
  statusDotIdle: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#C62828',
  },
  statusTextIdle: {
    color: '#374151',
  },
  micButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1976D2',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  tapText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
});
