function summarizeEvents(events) {
  return events.reduce((summary, event) => {
    summary.total += 1;
    summary.byEvent[event.event] = (summary.byEvent[event.event] || 0) + 1;
    return summary;
  }, { total: 0, byEvent: {} });
}

module.exports = { summarizeEvents };
