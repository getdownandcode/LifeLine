const EARTH_RADIUS_KM = 6371;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(fromLocation, toLocation) {
  const [fromLng, fromLat] = fromLocation.coordinates;
  const [toLng, toLat] = toLocation.coordinates;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toPoint(lng, lat) {
  return { type: 'Point', coordinates: [Number(lng), Number(lat)] };
}

module.exports = { calculateDistanceKm, toPoint };
