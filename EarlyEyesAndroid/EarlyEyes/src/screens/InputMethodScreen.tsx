import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import IconButton from '../components/IconButton';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function InputMethodScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Choose input method</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Take Photo</Text>
        <Text style={styles.cardText}>Capture a clear full-body image.</Text>
        <IconButton
          label="Open Camera"
          onPress={() => navigation.navigate('Camera')}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Describe by Voice</Text>
        <Text style={styles.cardText}>Record symptoms in your language.</Text>
        <IconButton
          label="Start Voice Input"
          variant="secondary"
          onPress={() => navigation.navigate('VoiceInput')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FAFAFA',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  cardText: {
    fontSize: 13,
    color: '#757575',
  },
});
