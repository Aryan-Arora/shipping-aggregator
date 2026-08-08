// Runs before every test file. config/supabase.ts throws at import time if
// these are missing — most test files mock that module away entirely, but
// this covers anything that imports it transitively without mocking it
// (e.g. a test that only cares about a pure function from the same file).
process.env.SUPABASE_URL ??= "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
