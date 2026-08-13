import React from 'react';
import {
  NavigationContainer,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SplashScreen from '../screens/SplashScreen.tsx';
import LanguageSelectScreen from '../screens/LanguageSelectScreen.tsx';
import OnboardingScreen from '../screens/OnboardingScreen.tsx';
import InputMethodScreen from '../screens/InputMethodScreen.tsx';
import CameraScreen from '../screens/CameraScreen.tsx';
import VoiceInputScreen from '../screens/VoiceInputScreen.tsx';
import ProcessingScreen from '../screens/ProcessingScreen.tsx';
import ResultScreen from '../screens/ResultScreen.tsx';
import HistoryScreen from '../screens/HistoryScreen.tsx';
import FacilityScreen from '../screens/FacilityScreen.tsx';
import SettingsScreen from '../screens/SettingsScreen.tsx';
import type { Assessment } from '../types/assessment';
import type { FinalAssessmentResult } from '../services/pipeline/AssessmentPipeline';
import type { AnalysisResult } from '../services/cv/ImageAnalysisService';
import type { DiseaseChunk } from '../services/rag/ChunkLoader';

export type ScanStackParamList = {
  InputMethod: { photoUri?: string; audioUri?: string } | undefined;
  Camera: { photoUri?: string; audioUri?: string } | undefined;
  VoiceInput: { photoUri?: string; audioUri?: string } | undefined;
  Processing: { photoUri?: string; audioUri?: string; text?: string } | undefined;
  Result: {
    result?: FinalAssessmentResult;
    assessmentId?: string;
    assessment?: Assessment;
    imageUri?: string;
    analysis?: AnalysisResult;
    diagnosis?: string;
    chunks?: DiseaseChunk[];
  } | undefined;
};

export type BottomTabParamList = {
  InputMethod: NavigatorScreenParams<ScanStackParamList> | undefined;
  History: undefined;
  Facility: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  LanguageSelect: { fromSettings?: boolean } | undefined;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();
const ScanStack = createNativeStackNavigator<ScanStackParamList>();

function ScanStackScreen() {
  return (
    <ScanStack.Navigator screenOptions={{ headerShown: false }}>
      <ScanStack.Screen name="InputMethod" component={InputMethodScreen} />
      <ScanStack.Screen name="Camera" component={CameraScreen} />
      <ScanStack.Screen name="VoiceInput" component={VoiceInputScreen} />
      <ScanStack.Screen name="Processing" component={ProcessingScreen} />
      <ScanStack.Screen name="Result" component={ResultScreen} />
    </ScanStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2F9E44',
        tabBarInactiveTintColor: '#9AA3AF',
        tabBarStyle: {
          height: 68,
          paddingTop: 6,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          backgroundColor: '#F3F0EE',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: string = 'circle';

          if (route.name === 'InputMethod') {
            iconName = 'camera';
          } else if (route.name === 'History') {
            iconName = 'history';
          } else if (route.name === 'Facility') {
            iconName = 'hospital-box-outline';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="InputMethod"
        component={ScanStackScreen}
        options={{ tabBarLabel: 'Scan' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="Facility"
        component={FacilityScreen}
        options={{ tabBarLabel: 'Centers' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

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
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
