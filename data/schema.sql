CREATE TABLE IF NOT EXISTS products (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL,
 price_cents INTEGER NOT NULL CHECK(price_cents > 0), image TEXT NOT NULL, color TEXT NOT NULL,
 available INTEGER NOT NULL DEFAULT 1, tags TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS creators (code TEXT PRIMARY KEY, display_name TEXT NOT NULL, commission_bps INTEGER NOT NULL CHECK(commission_bps BETWEEN 0 AND 10000), active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS quotes (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), product_id TEXT NOT NULL REFERENCES products(id),
 title TEXT NOT NULL, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', budget_cents INTEGER NOT NULL,
 merchant TEXT NOT NULL, referral_code TEXT, commission_bps INTEGER NOT NULL DEFAULT 0,
 expires_at INTEGER NOT NULL, approved_at INTEGER
);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id), session_id TEXT NOT NULL REFERENCES sessions(id),
 paypal_order_id TEXT UNIQUE, paypal_capture_id TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'CREATING',
 created_at INTEGER NOT NULL, captured_at INTEGER, commission_cents INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS orders_session ON orders(session_id);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
