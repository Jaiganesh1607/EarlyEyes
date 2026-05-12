import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function FacilityScreen() {
  const facilities = [
    {
      name: 'Mercy General Hospital',
      distance: '1.2 km',
      type: 'Hospital',
    },
    {
      name: 'Westside Community Clinic',
      distance: '3.5 km',
      type: 'Clinic',
    },
    {
      name: 'Pediatric Urgent Care',
      distance: '5.0 km',
      type: 'Urgent Care',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Pressable style={styles.iconButton}>
            <Icon name="menu" size={22} color="#0E5FB3" />
          </Pressable>
          <Text style={styles.brand}>EarlyEyes</Text>
          <Pressable style={styles.iconButton}>
            <Icon name="account-circle-outline" size={24} color="#0E5FB3" />
          </Pressable>
        </View>

        <Text style={styles.title}>Centers</Text>
        <Text style={styles.subtitle}>
          Nearest health facilities available offline.
        </Text>

        <View style={styles.list}>
          {facilities.map((facility) => (
            <View key={facility.name} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{facility.name}</Text>
                <View style={styles.distancePill}>
                  <Text style={styles.distanceText}>{facility.distance}</Text>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <Icon name="hospital-box-outline" size={16} color="#1F2937" />
                <Text style={styles.cardMetaText}>{facility.type}</Text>
              </View>
              <View style={styles.cardActions}>
                <Pressable style={styles.callButton}>
                  <Icon name="phone" size={18} color="#FFFFFF" />
                  <Text style={styles.callText}>Call</Text>
                </Pressable>
                <Pressable style={styles.infoButton}>
                  <Icon name="information" size={18} color="#1F2937" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F3',
  },
  scrollContent: {
    padding: 24,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFECEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0E5FB3',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1A19',
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
  },
  list: {
    gap: 16,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DBE7',
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1A19',
  },
  distancePill: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  distanceText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMetaText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0E5FB3',
    paddingVertical: 12,
    borderRadius: 12,
  },
  callText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  infoButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFECEA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
