CREATE TABLE business_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    display_name VARCHAR(120) NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 120),
    currency_code VARCHAR(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);
-- Installation defaults only; no catalog or demo data.
INSERT INTO business_settings (id, display_name, currency_code) VALUES (1, 'My Business', 'MAD');

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX categories_name_unique ON categories (lower(btrim(name)));

CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
    description VARCHAR(2000),
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    status VARCHAR(16) NOT NULL DEFAULT 'ARCHIVED' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX products_category_idx ON products(category_id, id);
CREATE INDEX products_status_idx ON products(status, id);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    sku VARCHAR(80) NOT NULL CHECK (char_length(btrim(sku)) BETWEEN 1 AND 80),
    name VARCHAR(120) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
    cost_price NUMERIC(19,4) NOT NULL CHECK (cost_price >= 0),
    current_price NUMERIC(19,4) NOT NULL CHECK (current_price > 0),
    min_price NUMERIC(19,4) NOT NULL CHECK (min_price > 0),
    max_price NUMERIC(19,4) NOT NULL CHECK (max_price > 0),
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT variant_price_bounds CHECK (min_price <= current_price AND current_price <= max_price)
);
CREATE UNIQUE INDEX variants_sku_unique ON product_variants(lower(btrim(sku)));
CREATE INDEX variants_product_status_idx ON product_variants(product_id, status, id);
