import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import IconButton from '../components/IconButton';
import VoiceWaveform from '../components/VoiceWaveform';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function VoiceInputScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Describe symptoms by voice</Text>
      <VoiceWaveform isActive />
      <View style={styles.transcriptBox}>
        <Text style={styles.transcriptText}>
          Transcript will appear here after recording.
        </Text>
      </View>
      <IconButton
        label="Stop & Analyze"
        onPress={() => navigation.navigate('Processing')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  transcriptBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
  },
  transcriptText: {
    color: '#616161',
  },
});
