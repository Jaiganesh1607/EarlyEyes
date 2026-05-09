import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import IconButton from '../components/IconButton';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function SplashScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>EarlyEyes</Text>
        <Text style={styles.subtitle}>Offline early warning for child health</Text>
      </View>
      <IconButton
        label="Get Started"
        onPress={() => navigation.navigate('LanguageSelect')}
      />
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
    marginTop: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#E53935',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    color: '#616161',
    textAlign: 'center',
  },
});
