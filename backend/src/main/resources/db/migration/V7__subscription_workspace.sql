CREATE TABLE installation_mode (
    id INTEGER PRIMARY KEY CHECK (id=1),
    mode VARCHAR(24) NOT NULL CHECK (mode IN ('ECOMMERCE','SAAS_SUBSCRIPTION')),
    initialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE subscription_prices (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES subscription_plans(id),
    amount NUMERIC(19,4) NOT NULL CHECK (amount>0),
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    interval VARCHAR(8) NOT NULL CHECK (interval IN ('MONTHLY','YEARLY')),
    effective_date DATE NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id,effective_date)
);
CREATE TABLE subscription_events (
    source_id VARCHAR(64) PRIMARY KEY,
    subscription_id VARCHAR(64) NOT NULL,
    kind VARCHAR(12) NOT NULL CHECK (kind IN ('START','CHANGE','CANCEL','END','REACTIVATE')),
    effective_date DATE NOT NULL,
    price_id VARCHAR(64) NOT NULL REFERENCES subscription_prices(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscription_id,effective_date)
);
CREATE INDEX subscription_events_history_idx ON subscription_events(subscription_id,effective_date);
CREATE INDEX subscription_events_date_idx ON subscription_events(effective_date,subscription_id);
CREATE TABLE subscription_payments (
    source_id VARCHAR(64) PRIMARY KEY,
    subscription_id VARCHAR(64) NOT NULL,
    kind VARCHAR(8) NOT NULL CHECK (kind IN ('PAID','REFUND')),
    amount NUMERIC(19,4) NOT NULL CHECK (amount>0),
    currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    effective_date DATE NOT NULL,
    charge_id VARCHAR(64) REFERENCES subscription_payments(source_id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((kind='PAID' AND charge_id IS NULL) OR (kind='REFUND' AND charge_id IS NOT NULL))
);
CREATE INDEX subscription_payments_history_idx ON subscription_payments(subscription_id,effective_date);
CREATE TABLE subscription_ingestion (
    source_id VARCHAR(64) PRIMARY KEY,
    payload TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
