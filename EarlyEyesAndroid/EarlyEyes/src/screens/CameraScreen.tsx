import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import IconButton from '../components/IconButton';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function CameraScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.preview}>
        <Text style={styles.previewText}>Camera preview placeholder</Text>
      </View>
      <Text style={styles.helperText}>Take a clear photo of your child.</Text>
      <IconButton
        label="Capture"
        onPress={() => navigation.navigate('Processing')}
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
  preview: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#ECEFF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: '#78909C',
  },
  helperText: {
    textAlign: 'center',
    color: '#616161',
    marginBottom: 16,
  },
});
