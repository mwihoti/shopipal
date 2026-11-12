ALTER TABLE quotes ADD COLUMN source TEXT NOT NULL DEFAULT 'catalog';
ALTER TABLE quotes ADD COLUMN source_variant_id TEXT;
ALTER TABLE quotes ADD COLUMN source_amount TEXT;
ALTER TABLE quotes ADD COLUMN source_currency TEXT;
ALTER TABLE quotes ADD COLUMN source_exchange_rate REAL;
ALTER TABLE quotes ADD COLUMN source_rate_updated_at TEXT;
