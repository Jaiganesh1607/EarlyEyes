import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen.tsx';
import LanguageSelectScreen from '../screens/LanguageSelectScreen.tsx';
import OnboardingScreen from '../screens/OnboardingScreen.tsx';
import HomeScreen from '../screens/HomeScreen.tsx';
import InputMethodScreen from '../screens/InputMethodScreen.tsx';
import CameraScreen from '../screens/CameraScreen.tsx';
import VoiceInputScreen from '../screens/VoiceInputScreen.tsx';
import ProcessingScreen from '../screens/ProcessingScreen.tsx';
import ResultScreen from '../screens/ResultScreen.tsx';
import HistoryScreen from '../screens/HistoryScreen.tsx';
import FacilityScreen from '../screens/FacilityScreen.tsx';
import SettingsScreen from '../screens/SettingsScreen.tsx';

export type RootStackParamList = {
  Splash: undefined;
  LanguageSelect: undefined;
  Onboarding: undefined;
  Home: undefined;
  InputMethod: undefined;
  Camera: undefined;
  VoiceInput: undefined;
  Processing: undefined;
  Result: undefined;
  History: undefined;
  Facility: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="InputMethod" component={InputMethodScreen} />
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="VoiceInput" component={VoiceInputScreen} />
        <Stack.Screen name="Processing" component={ProcessingScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Facility" component={FacilityScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
