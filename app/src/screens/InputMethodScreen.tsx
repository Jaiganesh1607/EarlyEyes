import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function InputMethodScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = route.params as RootStackParamList['InputMethod'] | undefined;
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [audioUri, setAudioUri] = useState<string | undefined>();

  useEffect(() => {
    if (params?.photoUri) {
      setPhotoUri(params.photoUri);
    }
    if (params?.audioUri) {
      setAudioUri(params.audioUri);
    }
  }, [params?.audioUri, params?.photoUri]);

  const canAnalyze = useMemo(() => {
    return Boolean(notes.trim() || photoUri || audioUri);
  }, [notes, photoUri, audioUri]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton}>
          <Icon name="menu" size={24} color="#0E5FB3" />
        </Pressable>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Icon name="shield-check" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>EarlyEyes</Text>
        </View>
        <Pressable
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="account-circle-outline" size={26} color="#0E5FB3" />
        </Pressable>
      </View>

      <Text style={styles.title}>Start Health Check</Text>
      <Text style={styles.subtitle}>
        Choose how you want to provide information today.
      </Text>

      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('Camera')}
      >
        <View style={styles.cardIconWrap}>
          <View style={[styles.cardIconPill, styles.cardIconBlue]}>
            <Icon name="camera-iris" size={22} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.cardTitle}>Take Photo</Text>
        <Text style={styles.cardText}>
          Capture a clear image of the physical symptom.
        </Text>
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('VoiceInput')}
      >
        <View style={styles.cardIconWrap}>
          <View style={[styles.cardIconPill, styles.cardIconGreen]}>
            <Icon name="microphone" size={22} color="#0B3D16" />
          </View>
        </View>
        <Text style={styles.cardTitle}>Describe Symptoms</Text>
        <Text style={styles.cardText}>
          Use your voice to explain what is happening.
        </Text>
      </Pressable>

      <View style={styles.notesCard}>
        <Text style={styles.notesLabel}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any observations before analyzing"
          placeholderTextColor="#9CA3AF"
          multiline
          style={styles.notesInput}
        />
        <View style={styles.attachments}>
          <View style={[styles.attachmentChip, !photoUri && styles.chipIdle]}>
            <Icon name="camera" size={14} color={photoUri ? '#0E5FB3' : '#9CA3AF'} />
            <Text style={[styles.chipText, !photoUri && styles.chipTextIdle]}>
              {photoUri ? 'Photo added' : 'No photo'}
            </Text>
          </View>
          <View style={[styles.attachmentChip, !audioUri && styles.chipIdle]}>
            <Icon name="microphone" size={14} color={audioUri ? '#0E5FB3' : '#9CA3AF'} />
            <Text style={[styles.chipText, !audioUri && styles.chipTextIdle]}>
              {audioUri ? 'Audio added' : 'No audio'}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.analyzeButton, !canAnalyze && styles.analyzeDisabled]}
        disabled={!canAnalyze}
        onPress={() =>
          navigation.navigate('Processing', {
            photoUri,
            audioUri,
            text: notes.trim() || undefined,
          })
        }
      >
        <Text style={styles.analyzeText}>Analyze</Text>
      </Pressable>

      <View style={styles.privacyCard}>
        <View style={styles.privacyIcon}>
          <Icon name="information" size={16} color="#1D4ED8" />
        </View>
        <View style={styles.privacyBody}>
          <Text style={styles.privacyTitle}>Privacy Assured</Text>
          <Text style={styles.privacyText}>
            All photos and audio are processed securely and are never shared
            without your explicit permission.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F7F4F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6BA7B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0E5FB3',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1A19',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#C7CCD6',
    gap: 10,
    marginBottom: 16,
  },
  cardIconWrap: {
    alignItems: 'center',
  },
  cardIconPill: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  cardIconBlue: {
    backgroundColor: '#0E5FB3',
  },
  cardIconGreen: {
    backgroundColor: '#8BE28F',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1A19',
    textAlign: 'center',
  },
  cardText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
  },
  privacyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#EFECEA',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  privacyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyBody: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  privacyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 4,
  },
  notesCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  notesInput: {
    minHeight: 84,
    fontSize: 14,
    color: '#1F2937',
    textAlignVertical: 'top',
  },
  attachments: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8F0FF',
  },
  chipIdle: {
    backgroundColor: '#F3F4F6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E5FB3',
  },
  chipTextIdle: {
    color: '#9CA3AF',
  },
  analyzeButton: {
    borderRadius: 16,
    backgroundColor: '#1976D2',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  analyzeDisabled: {
    backgroundColor: '#C7CDD4',
  },
  analyzeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
