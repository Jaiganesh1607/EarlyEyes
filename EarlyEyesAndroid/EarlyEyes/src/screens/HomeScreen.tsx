import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import IconButton from '../components/IconButton';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>EarlyEyes</Text>
        <IconButton
          label="Settings"
          variant="secondary"
          onPress={() => navigation.navigate('Settings')}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.prompt}>Ready to check your child?</Text>
        <IconButton
          label="Check My Child"
          onPress={() => navigation.navigate('InputMethod')}
        />
        <View style={styles.spacer} />
        <IconButton
          label="History"
          variant="secondary"
          onPress={() => navigation.navigate('History')}
        />
      </View>
      <DisclaimerBanner />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  body: {
    gap: 16,
  },
  prompt: {
    fontSize: 16,
    color: '#424242',
  },
  spacer: {
    height: 4,
  },
});
