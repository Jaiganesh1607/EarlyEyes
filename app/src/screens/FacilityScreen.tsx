import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Linking,
  Platform,
  PermissionsAndroid
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrandHeader from '../components/BrandHeader';
import { FacilityService, Facility } from '../services/location/FacilityService';

export default function FacilityScreen() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }
        const list = await FacilityService.getRecommendedFacilities();
        setFacilities(list);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleNavigate = (facility: Facility) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${facility.name}@${facility.latitude},${facility.longitude}`,
      android: `geo:0,0?q=${facility.latitude},${facility.longitude}(${facility.name})`
    });
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <BrandHeader size={26} />
        </View>

        <Text style={styles.title}>Centers</Text>
        <Text style={styles.subtitle}>
          Nearest health facilities available offline.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#1D4ED8" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {facilities.map((facility) => (
              <View key={facility.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{facility.name}</Text>
                  {facility.distanceKm !== undefined && (
                    <View style={styles.distancePill}>
                      <Text style={styles.distanceText}>{facility.distanceKm.toFixed(1)} km</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardMeta}>
                  <Icon 
                    name={facility.type === 'who' ? 'earth' : facility.type === 'gov' ? 'hospital-building' : 'eye-circle'} 
                    size={16} 
                    color="#1F2937" 
                  />
                  <Text style={styles.cardMetaText}>
                    {facility.type === 'who' ? 'WHO Centre' : facility.type === 'gov' ? 'Gov Hospital' : 'Private'} 
                    {' • '}
                    {facility.level === 'tertiary' ? 'Specialist Care' : 'Primary Care'}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable style={styles.callButton} onPress={() => handleNavigate(facility)}>
                    <Icon name="navigation" size={18} color="#FFFFFF" />
                    <Text style={styles.callText}>Navigate</Text>
                  </Pressable>
                  <Pressable style={styles.infoButton}>
                    <Icon name="information" size={18} color="#1F2937" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
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
    alignItems: 'center',
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
