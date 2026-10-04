import { applyTestDatabaseEnvironment } from './support/test-database.js';

// Runs in every e2e worker before any spec (and therefore AppModule) is imported.
applyTestDatabaseEnvironment();
