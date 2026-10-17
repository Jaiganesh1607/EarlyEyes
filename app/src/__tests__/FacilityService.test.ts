import { FacilityService } from '../services/location/FacilityService';

// Mock Geolocation to simulate user in Chennai
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn((success) => {
    success({
      coords: {
        latitude: 13.0827, // Chennai coordinates
        longitude: 80.2707,
      },
    });
  }),
}));

describe('FacilityService Smart Routing', () => {
  it('should return a tertiary GH when riskLevel is urgent', async () => {
    const facility = await FacilityService.getNearestFacility('urgent', 'general');
    expect(facility.type).toBe('gov');
    expect(facility.level).toBe('tertiary');
    // From Chennai, Rajiv Gandhi GH is closest
    expect(facility.id).toBe('tn-chennai-gh1');
  });

  it('should return a primary PHC when riskLevel is monitor/mild', async () => {
    const facility = await FacilityService.getNearestFacility('mild', 'general');
    expect(facility.type).toBe('gov');
    expect(facility.level).toBe('primary');
  });

  it('should return an eye specialty hospital when category is eye', async () => {
    const facility = await FacilityService.getNearestFacility('urgent', 'eye');
    expect(facility.specialty).toBe('eye');
    expect(facility.level).toBe('tertiary');
    // Regional Institute of Ophthalmology is in Chennai
    expect(facility.id).toBe('tn-03');
  });

  it('should return a sorted list of recommended facilities', async () => {
    const list = await FacilityService.getRecommendedFacilities('urgent');
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].level).toBe('tertiary');
    // Make sure they are sorted by distance
    if (list.length > 1) {
      expect(list[0].distanceKm).toBeLessThanOrEqual(list[1].distanceKm!);
    }
  });
});
