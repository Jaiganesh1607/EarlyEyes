import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import IconButton from '../components/IconButton';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function OnboardingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.step}>1</Text>
        <Text style={styles.text}>Take a clear photo of your child</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.step}>2</Text>
        <Text style={styles.text}>We check for warning signs</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.step}>3</Text>
        <Text style={styles.text}>We guide you to seek help</Text>
      </View>
      <IconButton
        label="Continue"
        onPress={() => navigation.navigate('Home')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  step: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E53935',
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '700',
  },
  text: {
    fontSize: 15,
    color: '#1E1E1E',
    flex: 1,
  },
});
