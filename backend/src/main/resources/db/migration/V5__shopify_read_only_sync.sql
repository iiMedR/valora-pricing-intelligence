-- No data backfill, seeding or changes to existing financial snapshots.
ALTER TABLE product_variants ALTER COLUMN cost_price DROP NOT NULL;
ALTER TABLE product_variants DROP CONSTRAINT product_variants_current_price_check;
ALTER TABLE product_variants ADD CHECK(current_price >= 0);
ALTER TABLE product_variants DROP CONSTRAINT product_variants_min_price_check;
ALTER TABLE product_variants ADD CHECK(min_price >= 0);

CREATE TABLE shopify_sync_job (
    id UUID PRIMARY KEY,
    connection_id BIGINT NOT NULL DEFAULT 1 CHECK(connection_id=1) REFERENCES shopify_connection(id),
    shop_domain VARCHAR(80) NOT NULL,
    generation BIGINT NOT NULL,
    kind VARCHAR(16) NOT NULL CHECK(kind IN ('INITIAL','INCREMENTAL')),
    state VARCHAR(16) NOT NULL CHECK(state IN ('PENDING','RUNNING','SUCCEEDED','PARTIAL','FAILED')),
    window_from TIMESTAMPTZ NOT NULL,
    window_to TIMESTAMPTZ NOT NULL CHECK(window_to>window_from),
    max_pages INTEGER NOT NULL CHECK(max_pages BETWEEN 1 AND 200),
    attempt_pages INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 1,
    counts JSONB NOT NULL DEFAULT '{}',
    warnings JSONB NOT NULL DEFAULT '[]',
    error_code VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX shopify_one_active_sync ON shopify_sync_job(connection_id) WHERE state IN ('PENDING','RUNNING');
CREATE INDEX shopify_sync_history_idx ON shopify_sync_job(created_at DESC,id);
CREATE TABLE shopify_sync_checkpoint (
    job_id UUID NOT NULL REFERENCES shopify_sync_job(id),
    resource VARCHAR(16) NOT NULL CHECK(resource IN ('CATALOG','ORDERS')),
    cursor TEXT,
    complete BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY(job_id,resource)
);
CREATE TABLE shopify_sync_watermark (
    shop_domain VARCHAR(80) PRIMARY KEY,
    through_time TIMESTAMPTZ NOT NULL,
    job_id UUID NOT NULL REFERENCES shopify_sync_job(id)
);
CREATE TABLE shopify_source_mapping (
    connection_id BIGINT NOT NULL DEFAULT 1 CHECK(connection_id=1) REFERENCES shopify_connection(id),
    shop_domain VARCHAR(80) NOT NULL,
    resource VARCHAR(24) NOT NULL CHECK(resource IN ('PRODUCT','VARIANT','ORDER','LINE','REFUND','INVENTORY')),
    external_id VARCHAR(256) NOT NULL,
    local_id UUID NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    local_version BIGINT,
    seen_job UUID REFERENCES shopify_sync_job(id),
    source_sku VARCHAR(256),
    source_updated_at TIMESTAMPTZ,
    PRIMARY KEY(connection_id,shop_domain,resource,external_id),
    UNIQUE(resource,local_id)
);
CREATE INDEX shopify_mapping_local_idx ON shopify_source_mapping(local_id);
CREATE INDEX shopify_mapping_seen_idx ON shopify_source_mapping(shop_domain,resource,seen_job);
CREATE TABLE shopify_inventory_location (
    shop_domain VARCHAR(80) NOT NULL,
    inventory_item_id VARCHAR(256) NOT NULL,
    location_id VARCHAR(256) NOT NULL,
    source_updated_at TIMESTAMPTZ NOT NULL,
    available INTEGER NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(shop_domain,inventory_item_id,location_id,source_updated_at)
);
CREATE TABLE shopify_order_metadata (
    order_id UUID PRIMARY KEY REFERENCES sales_orders(id),
    source_updated_at TIMESTAMPTZ NOT NULL,
    financial_status VARCHAR(40) NOT NULL,
    fulfillment_status VARCHAR(40) NOT NULL,
    cancelled_at TIMESTAMPTZ,
    fulfilled_quantity INTEGER NOT NULL DEFAULT 0
);
