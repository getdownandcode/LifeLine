const { encode } = require('../utils/geohash');

function matchCacheKey(location, bloodType, radiusMeters, organRequired) {
  const [lng, lat] = location.coordinates;
  return `match:${encode(lat, lng, 6)}:${bloodType}:${radiusMeters}:${organRequired || 'blood'}`;
}

async function getJson(redis, key) {
  if (!redis?.get) return null;
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

async function setJson(redis, key, value, ttlSeconds) {
  if (!redis?.setex) return;
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

module.exports = { matchCacheKey, getJson, setJson };
