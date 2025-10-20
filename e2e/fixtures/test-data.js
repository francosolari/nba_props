// e2e/fixtures/test-data.js
// Test data fixtures for E2E tests

/**
 * Sample user data for testing
 */
const testUsers = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  regularUser: {
    username: process.env.TEST_USERNAME || 'testuser',
    password: process.env.TEST_PASSWORD || 'testpassword',
  },
};

/**
 * Sample prediction data
 */
const samplePredictions = {
  mvp: 'Giannis Antetokounmpo',
  dpoy: 'Rudy Gobert',
  roty: 'Victor Wembanyama',
  mip: 'Tyrese Maxey',
  coy: 'Erik Spoelstra',
  sixthMan: 'Malcolm Brogdon',
};

/**
 * Sample team standings
 */
const easternConferenceTeams = [
  'Boston Celtics',
  'Milwaukee Bucks',
  'Philadelphia 76ers',
  'Miami Heat',
  'New York Knicks',
  'Cleveland Cavaliers',
  'Indiana Pacers',
  'Orlando Magic',
];

const westernConferenceTeams = [
  'Denver Nuggets',
  'Oklahoma City Thunder',
  'Minnesota Timberwolves',
  'Dallas Mavericks',
  'Los Angeles Clippers',
  'Phoenix Suns',
  'Los Angeles Lakers',
  'Golden State Warriors',
];

/**
 * Generate unique test user
 */
function generateTestUser() {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    email: `testuser_${timestamp}@example.com`,
    password: 'TestPassword123!',
  };
}

/**
 * Get current season slug
 */
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-indexed

  // NBA season runs from October to April
  if (month >= 10) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

module.exports = {
  testUsers,
  samplePredictions,
  easternConferenceTeams,
  westernConferenceTeams,
  generateTestUser,
  getCurrentSeason,
};
