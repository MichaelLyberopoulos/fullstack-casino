import { execSync } from 'child_process';
import * as path from 'path';

const TEST_DATABASE_URL =
  'postgresql://casino:casino_test_password@localhost:5433/casino_test?schema=public';

/** Applies all migrations to the test database before the e2e suite runs. */
export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
