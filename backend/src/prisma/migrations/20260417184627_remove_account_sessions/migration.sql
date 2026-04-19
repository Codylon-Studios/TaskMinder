-- This drops the account sessions table since session management to moving to redis (>= v2.2.6)
-- DropTable
DROP TABLE "account_sessions";
