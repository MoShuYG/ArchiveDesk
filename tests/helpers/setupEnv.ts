process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
process.env.JWT_ACCESS_SECRET = "test_access_secret_123456";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_123456";
process.env.REQUIRE_HTTPS = "false";
process.env.CORS_ORIGIN = "http://localhost";

import { clearAllTables, closeDb, getDb } from "../../src/api/utils/dbUtils";
import { clearRateLimitBuckets } from "../../src/middleware/rateLimit";
import { folderCoverStore } from "../../src/services/folderCoverStore";

beforeAll(() => {
  getDb();
});

beforeEach(async () => {
  clearRateLimitBuckets();
  clearAllTables();
  await folderCoverStore.clearAllForTests();
});

afterAll(() => {
  closeDb();
});
