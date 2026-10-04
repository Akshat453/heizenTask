import { migrateTestDatabase } from './support/migrate-test-database.js';

// Fails the whole e2e run before any worker starts unless TEST_DATABASE_URL is safe,
// then deploys migrations to that dedicated test database.
export default function setup(): void {
  migrateTestDatabase();
}
