db = db.getSiblingDB('lifeline_matching');
db.donors.createIndex({ location: '2dsphere', bloodType: 1, availability: 1, healthStatus: 1 });
db.emergencyrequests.createIndex({ location: '2dsphere', urgency: 1, status: 1 });

db = db.getSiblingDB('lifeline_inventory');
db.inventories.createIndex({ hospitalId: 1, bloodType: 1 }, { unique: true });
db.inventories.createIndex({ location: '2dsphere' });

db = db.getSiblingDB('lifeline_analytics');
db.eventlogs.createIndex({ eventId: 1 }, { unique: true });
db.eventlogs.createIndex({ event: 1, timestamp: -1 });
