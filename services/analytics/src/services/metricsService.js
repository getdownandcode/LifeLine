function summarizeEvents(events) {
  return events.reduce((summary, event) => {
    summary.total += 1;
    summary.byEvent[event.event] = (summary.byEvent[event.event] || 0) + 1;
    return summary;
  }, { total: 0, byEvent: {} });
}

/**
 * Query events from MongoDB with optional time range filter
 * @param {Model} EventLog - Mongoose EventLog model
 * @param {Object} options - Query options
 * @param {number} options.hoursBack - Query last N hours (default: 24)
 * @param {string} options.event - Filter by specific event type
 * @param {string} options.correlationId - Filter by correlation ID
 * @returns {Promise<Array>} Array of event documents
 */
async function getEventsFromDb(EventLog, options = {}) {
  const { hoursBack = 24, event, correlationId } = options;
  
  // Build filter
  const filter = {
    timestamp: { $gte: new Date(Date.now() - hoursBack * 60 * 60 * 1000) }
  };
  
  if (event) filter.event = event;
  if (correlationId) filter.correlationId = correlationId;
  
  return EventLog.find(filter).sort({ timestamp: -1 }).lean().exec();
}

/**
 * Calculate metrics from database query results
 * @param {Array} events - Array of event documents from database
 * @returns {Object} Metrics summary
 */
function calculateMetricsFromDb(events) {
  return events.reduce((summary, event) => {
    summary.total += 1;
    summary.byEvent[event.event] = (summary.byEvent[event.event] || 0) + 1;
    return summary;
  }, { total: 0, byEvent: {} });
}

/**
 * Get metrics from database for a time period
 * @param {Model} EventLog - Mongoose EventLog model
 * @param {Object} options - Query options (hoursBack, event, correlationId)
 * @returns {Promise<Object>} Metrics summary
 */
async function getMetricsFromDb(EventLog, options = {}) {
  const events = await getEventsFromDb(EventLog, options);
  return calculateMetricsFromDb(events);
}

module.exports = { summarizeEvents, getEventsFromDb, calculateMetricsFromDb, getMetricsFromDb };
