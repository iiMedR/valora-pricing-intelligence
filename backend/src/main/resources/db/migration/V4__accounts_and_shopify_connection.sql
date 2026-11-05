-- Security/connection metadata only. No catalog/history updates or sample account/credential.
CREATE TABLE app_accounts (
    id BIGINT PRIMARY KEY CHECK(id=1),
    username VARCHAR(64) NOT NULL UNIQUE CHECK(username ~ '^[a-z0-9._-]{3,64}$'),
    password_hash VARCHAR(100) NOT NULL CHECK(password_hash LIKE '$2%'),
    role VARCHAR(16) NOT NULL DEFAULT 'ADMIN' CHECK(role='ADMIN'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE shopify_connection (
    id BIGINT PRIMARY KEY CHECK(id=1),
    business_id BIGINT NOT NULL DEFAULT 1 CHECK(business_id=1) REFERENCES business_settings(id),
    provider VARCHAR(16) NOT NULL DEFAULT 'SHOPIFY' CHECK(provider='SHOPIFY'),
    shop_domain VARCHAR(80),
    status VARCHAR(16) NOT NULL CHECK(status IN ('DISCONNECTED','PENDING','CONNECTED','FAILED')),
    scopes VARCHAR(1000),
    encrypted_access_token TEXT CHECK(encrypted_access_token IS NULL OR encrypted_access_token LIKE 'v1:%'),
    encrypted_refresh_token TEXT CHECK(encrypted_refresh_token IS NULL OR encrypted_refresh_token LIKE 'v1:%'),
    access_expires_at TIMESTAMPTZ,
    refresh_expires_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    last_error VARCHAR(64),
    generation BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((status='CONNECTED') = (encrypted_access_token IS NOT NULL)),
    CHECK ((encrypted_access_token IS NULL) = (encrypted_refresh_token IS NULL))
);
INSERT INTO shopify_connection(id,status) VALUES(1,'DISCONNECTED');
CREATE TABLE shopify_oauth_states (
    state_hash VARCHAR(64) PRIMARY KEY CHECK(state_hash ~ '^[a-f0-9]{64}$'),
    connection_id BIGINT NOT NULL DEFAULT 1 CHECK(connection_id=1) REFERENCES shopify_connection(id),
    account_id BIGINT NOT NULL CHECK(account_id=1) REFERENCES app_accounts(id),
    session_binding_hash VARCHAR(64) NOT NULL,
    shop_domain VARCHAR(80) NOT NULL,
    generation BIGINT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(expires_at>created_at)
);
CREATE INDEX shopify_oauth_expiry_idx ON shopify_oauth_states(expires_at);
CREATE UNIQUE INDEX shopify_one_pending_state ON shopify_oauth_states((1)) WHERE consumed_at IS NULL;
