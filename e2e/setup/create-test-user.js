// e2e/setup/create-test-user.js
// Script to create a test user in the database before running E2E tests

const { execSync } = require('child_process');

const TEST_USERNAME = process.env.TEST_USERNAME || 'e2e_testuser';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!';
const TEST_EMAIL = process.env.TEST_EMAIL || 'e2e_test@example.com';

try {
  console.log('Creating test user for E2E tests...');

  const command = `python backend/manage.py shell -c "
from django.contrib.auth.models import User
try:
    user = User.objects.get(username='${TEST_USERNAME}')
    print('Test user already exists: ${TEST_USERNAME}')
except User.DoesNotExist:
    user = User.objects.create_user('${TEST_USERNAME}', '${TEST_EMAIL}', '${TEST_PASSWORD}')
    print('Created test user: ${TEST_USERNAME}')
"`;

  execSync(command, { stdio: 'inherit' });
  console.log('Test user setup complete!');
} catch (error) {
  console.error('Error creating test user:', error.message);
  process.exit(1);
}
