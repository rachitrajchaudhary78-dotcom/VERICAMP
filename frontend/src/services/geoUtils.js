/**
 * Haversine distance calculation in meters
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in meters rounded to 1 decimal place
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Format coordinates nicely
 */
export function formatCoordinate(val, type = 'lat') {
  if (val === null || val === undefined) return '--';
  const dir = type === 'lat' ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
  return `${Math.abs(val).toFixed(5)}° ${dir}`;
}

/**
 * Default Campus Coordinates: SKIT Jaipur (IEEE Hackathon Host)
 */
export const DEFAULT_CAMPUS = {
  campus_name: 'Swami Keshvanand Institute of Technology (SKIT) - Campus',
  latitude: 26.8227,
  longitude: 75.8653,
  allowed_radius_meters: 300,
  wifi_ssid_required: true,
  wifi_ssid_name: 'SKIT_CAMPUS_SECURE'
};
