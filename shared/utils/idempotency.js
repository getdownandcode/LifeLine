const memoryStore = new Map();

async function isDuplicateEvent(redis, eventId, ttlSeconds = 86400) {
  if (!eventId) return false;
  const key = `processed:event:${eventId}`;

  if (redis?.set) {
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result !== 'OK';
  }

  if (memoryStore.has(key)) return true;
  memoryStore.set(key, Date.now() + ttlSeconds * 1000);
  return false;
}

module.exports = { isDuplicateEvent };
