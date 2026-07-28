// Runs before each e2e suite: point the app at the disposable test database
// (docker-compose service postgres_test on port 5433) — never the dev DB.
process.env.DATABASE_URL =
  'postgresql://casino:casino_test_password@localhost:5433/casino_test?schema=public';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
