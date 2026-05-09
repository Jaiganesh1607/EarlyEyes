import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LanguagePicker from '../components/LanguagePicker';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function LanguageSelectScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Language</Text>
        <Text style={styles.subtitle}>Select a language for the app</Text>
      </View>
      <LanguagePicker onSelect={() => navigation.navigate('Onboarding')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#757575',
  },
});
