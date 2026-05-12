import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="menu" size={24} color="#0E5FB3" />
        </Pressable>
        <Text style={styles.brand}>EarlyEyes</Text>
        <Pressable
          style={styles.iconButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="account-circle-outline" size={26} color="#0E5FB3" />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Ready to scan?</Text>
        <Text style={styles.subtitle}>
          Ensure you are in a well-lit room for the most accurate preliminary
          check.
        </Text>

        <Pressable
          style={styles.primaryCard}
          onPress={() => navigation.navigate('InputMethod')}
        >
          <View style={styles.primaryIcon}>
            <Icon name="camera-outline" size={26} color="#C62828" />
          </View>
          <Text style={styles.primaryCardText}>Check My Child</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryRow}
          onPress={() => navigation.navigate('History')}
        >
          <View style={styles.secondaryIcon}>
            <Icon name="history" size={18} color="#0E5FB3" />
          </View>
          <Text style={styles.secondaryText}>View Scan History</Text>
          <Icon name="chevron-right" size={22} color="#6B7280" />
        </Pressable>

        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerIcon}>
            <Icon name="information" size={16} color="#B91C1C" />
          </View>
          <Text style={styles.disclaimerText}>
            EarlyEyes provides a preliminary assessment and is not a substitute
            for professional medical diagnosis. Always consult a pediatrician
            for health concerns.
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
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0E5FB3',
  },
  body: {
    flex: 1,
    gap: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1A19',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
  },
  primaryCard: {
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#C62828',
    backgroundColor: '#FBF7F6',
    alignItems: 'center',
    paddingVertical: 28,
    gap: 16,
  },
  primaryIcon: {
    width: 64,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C62828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCardText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#C62828',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C0C6D4',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  secondaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0E5FB3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  disclaimerCard: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#E6E7EA',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  disclaimerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#374151',
  },
});
