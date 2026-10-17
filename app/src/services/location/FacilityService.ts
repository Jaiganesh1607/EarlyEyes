import Geolocation from '@react-native-community/geolocation';
import facilities from '../../data/facilities_tn.json';

export type FacilityType = 'who' | 'gov' | 'private';
export type FacilityLevel = 'primary' | 'tertiary';
export type FacilitySpecialty = 'general' | 'eye' | 'pediatric';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  level: FacilityLevel;
  specialty: FacilitySpecialty;
  latitude: number;
  longitude: number;
  address: string;
  description: string;
  distanceKm?: number;
}

// Haversine formula to calculate distance between two lat/lon points in kilometers
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const FacilityService = {
  getCurrentLocation: (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  },

  getNearestFacility: async (riskLevel?: string, category?: string): Promise<Facility> => {
    try {
      const userLoc = await FacilityService.getCurrentLocation();
      let nearest: Facility | null = null;
      let minDistance = Infinity;
      let matchedFacilities = facilities as Facility[];

      // Filter 1: Government priority (if requested or by default for this region)
      const govFacilities = matchedFacilities.filter(f => f.type === 'gov');
      if (govFacilities.length > 0) {
        matchedFacilities = govFacilities;
      }

      // Filter 2: Level based on Risk
      if (riskLevel === 'urgent' || riskLevel === 'high' || riskLevel === 'critical') {
        const tertiary = matchedFacilities.filter(f => f.level === 'tertiary');
        if (tertiary.length > 0) matchedFacilities = tertiary;
      } else if (riskLevel === 'monitor' || riskLevel === 'mild') {
        const primary = matchedFacilities.filter(f => f.level === 'primary');
        if (primary.length > 0) matchedFacilities = primary;
      }

      // Filter 3: Specialty based on Category
      if (category && category.toLowerCase().includes('eye')) {
        const eyeSpecialty = matchedFacilities.filter(f => f.specialty === 'eye');
        if (eyeSpecialty.length > 0) {
          matchedFacilities = eyeSpecialty;
        }
      }

      // Fallback if filtering resulted in 0 somehow
      if (matchedFacilities.length === 0) {
        matchedFacilities = facilities as Facility[];
      }

      for (const facility of matchedFacilities) {
        const distance = getDistanceFromLatLonInKm(
          userLoc.latitude,
          userLoc.longitude,
          facility.latitude,
          facility.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = { ...facility, distanceKm: distance };
        }
      }

      if (!nearest) {
        throw new Error('No facilities found');
      }

      return nearest;
    } catch (e) {
      console.warn("Failed to get location, falling back to default facility", e);
      // Fallback to Madurai Aravind Eye Hospital if location fails
      return {
        ...(facilities[0] as Facility),
        distanceKm: undefined
      };
    }
  },

  getRecommendedFacilities: async (riskLevel?: string): Promise<Facility[]> => {
    try {
      const userLoc = await FacilityService.getCurrentLocation();
      let matchedFacilities = facilities as Facility[];

      // Apply risk level filtering
      if (riskLevel === 'urgent' || riskLevel === 'high' || riskLevel === 'critical') {
        const tertiary = matchedFacilities.filter(f => f.level === 'tertiary');
        if (tertiary.length > 0) matchedFacilities = tertiary;
      } else if (riskLevel === 'monitor' || riskLevel === 'mild') {
        const primary = matchedFacilities.filter(f => f.level === 'primary');
        if (primary.length > 0) matchedFacilities = primary;
      }

      // Calculate distances and sort
      const withDistances = matchedFacilities.map(f => {
        const distance = getDistanceFromLatLonInKm(
          userLoc.latitude, userLoc.longitude,
          f.latitude, f.longitude
        );
        return { ...f, distanceKm: distance };
      });

      return withDistances.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    } catch (e) {
      console.warn("Failed to get location for list", e);
      return facilities as Facility[];
    }
  }
};
