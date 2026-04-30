const BLOOD_TYPES = Object.freeze(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

const COMPATIBILITY_MATRIX = Object.freeze({
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-']
});

function getCompatibleBloodTypes(recipientBloodType) {
  return COMPATIBILITY_MATRIX[recipientBloodType] || [];
}

module.exports = { BLOOD_TYPES, COMPATIBILITY_MATRIX, getCompatibleBloodTypes };
