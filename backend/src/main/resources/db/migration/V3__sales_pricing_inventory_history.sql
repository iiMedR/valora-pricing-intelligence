-- No backfill: pre-existing catalog values do not establish historical observations.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE sales_orders (
    id UUID PRIMARY KEY,
    source VARCHAR(16) NOT NULL CHECK (source IN ('MANUAL','SHOPIFY','DEMO')),
    external_reference VARCHAR(160) CHECK (external_reference IS NULL OR length(btrim(external_reference)) > 0),
    payload_hash VARCHAR(64) NOT NULL,
    placed_at TIMESTAMPTZ NOT NULL,
    source_updated_at TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL CHECK (status IN ('COMPLETED','UNPAID','CANCELLED')),
    currency_code VARCHAR(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
    subtotal NUMERIC(19,4) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(19,4) NOT NULL CHECK (discount_amount >= 0 AND discount_amount <= subtotal),
    shipping_amount NUMERIC(19,4) CHECK (shipping_amount >= 0),
    tax_amount NUMERIC(19,4) CHECK (tax_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id,currency_code),
    UNIQUE(source,external_reference)
);
CREATE INDEX sales_orders_date_idx ON sales_orders(placed_at DESC,id);
CREATE INDEX sales_orders_status_source_idx ON sales_orders(status,source,placed_at DESC,id);

CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    source_line_reference VARCHAR(160),
    sku_snapshot VARCHAR(80) NOT NULL,
    name_snapshot VARCHAR(120) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
    currency_code VARCHAR(3) NOT NULL,
    list_unit_price NUMERIC(19,4) CHECK (list_unit_price >= 0),
    unit_price NUMERIC(19,4) NOT NULL CHECK (unit_price >= 0),
    discount_amount NUMERIC(19,4) NOT NULL CHECK (discount_amount >= 0),
    line_net NUMERIC(19,4) NOT NULL CHECK (line_net >= 0 AND line_net = quantity * unit_price - discount_amount),
    unit_cost NUMERIC(19,4) CHECK (unit_cost >= 0),
    cost_provenance VARCHAR(24) NOT NULL CHECK (cost_provenance IN ('PROVIDED','EFFECTIVE_HISTORY','UNKNOWN')),
    CHECK ((unit_cost IS NULL) = (cost_provenance = 'UNKNOWN')),
    FOREIGN KEY(order_id,currency_code) REFERENCES sales_orders(id,currency_code) ON DELETE RESTRICT,
    UNIQUE(id,order_id,currency_code),
    UNIQUE(order_id,source_line_reference)
);
CREATE INDEX sales_items_variant_order_idx ON sales_order_items(variant_id,order_id);

CREATE TABLE sales_refunds (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    item_id UUID,
    source VARCHAR(16) NOT NULL CHECK (source IN ('MANUAL','SHOPIFY','DEMO')),
    external_reference VARCHAR(160) CHECK (external_reference IS NULL OR length(btrim(external_reference)) > 0),
    payload_hash VARCHAR(64) NOT NULL,
    refunded_at TIMESTAMPTZ NOT NULL,
    kind VARCHAR(24) NOT NULL CHECK (kind IN ('LINE_RETURN','FINANCIAL_ADJUSTMENT','SHIPPING','TAX')),
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    amount NUMERIC(19,4) NOT NULL CHECK (amount >= 0),
    currency_code VARCHAR(3) NOT NULL,
    reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id,currency_code) REFERENCES sales_orders(id,currency_code) ON DELETE RESTRICT,
    FOREIGN KEY(item_id,order_id,currency_code) REFERENCES sales_order_items(id,order_id,currency_code) ON DELETE RESTRICT,
    CHECK ((kind='LINE_RETURN' AND item_id IS NOT NULL AND quantity>0)
        OR (kind='FINANCIAL_ADJUSTMENT' AND item_id IS NOT NULL AND quantity=0 AND amount>0)
        OR (kind IN ('SHIPPING','TAX') AND item_id IS NULL AND quantity=0 AND amount>0)),
    UNIQUE(source,external_reference)
);
CREATE INDEX sales_refunds_order_time_idx ON sales_refunds(order_id,refunded_at,id);
CREATE INDEX sales_refunds_item_idx ON sales_refunds(item_id);

CREATE TABLE variant_price_history (
    id UUID PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency_code VARCHAR(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    source VARCHAR(16) NOT NULL CHECK (source IN ('MANUAL','SHOPIFY','DEMO')),
    quality VARCHAR(24) NOT NULL CHECK (quality IN ('VERIFIED_CHANGE','SNAPSHOT','INFERRED')),
    external_reference VARCHAR(160) CHECK (external_reference IS NULL OR length(btrim(external_reference)) > 0),
    payload_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_to IS NULL OR valid_to > valid_from),
    CHECK (quality='VERIFIED_CHANGE' OR valid_to IS NULL),
    UNIQUE(source,external_reference),
    EXCLUDE USING gist (variant_id WITH =, tstzrange(valid_from,valid_to,'[)') WITH &&)
        WHERE (quality='VERIFIED_CHANGE')
);
CREATE INDEX price_history_variant_time_idx ON variant_price_history(variant_id,valid_from DESC,id);

CREATE TABLE variant_cost_history (
    id UUID PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    amount NUMERIC(19,4) NOT NULL CHECK (amount >= 0),
    currency_code VARCHAR(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    source VARCHAR(16) NOT NULL CHECK (source IN ('MANUAL','SHOPIFY','DEMO')),
    quality VARCHAR(24) NOT NULL CHECK (quality IN ('VERIFIED_CHANGE','SNAPSHOT','INFERRED')),
    external_reference VARCHAR(160) CHECK (external_reference IS NULL OR length(btrim(external_reference)) > 0),
    payload_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_to IS NULL OR valid_to > valid_from),
    CHECK (quality='VERIFIED_CHANGE' OR valid_to IS NULL),
    UNIQUE(source,external_reference),
    EXCLUDE USING gist (variant_id WITH =, tstzrange(valid_from,valid_to,'[)') WITH &&)
        WHERE (quality='VERIFIED_CHANGE')
);
CREATE INDEX cost_history_variant_time_idx ON variant_cost_history(variant_id,valid_from DESC,id);

CREATE TABLE inventory_snapshots (
    id UUID PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    observed_at TIMESTAMPTZ NOT NULL,
    quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
    source VARCHAR(16) NOT NULL CHECK (source IN ('MANUAL','SHOPIFY','DEMO')),
    quality VARCHAR(24) NOT NULL CHECK (quality IN ('VERIFIED_CHANGE','SNAPSHOT','INFERRED')),
    external_reference VARCHAR(160) CHECK (external_reference IS NULL OR length(btrim(external_reference)) > 0),
    payload_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source,external_reference)
);
CREATE INDEX inventory_variant_time_idx ON inventory_snapshots(variant_id,observed_at DESC,id);

CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Historical financial records are immutable' USING ERRCODE='23514';
END $$;
CREATE TRIGGER immutable_orders BEFORE UPDATE OR DELETE ON sales_orders FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_items BEFORE UPDATE OR DELETE ON sales_order_items FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_refunds BEFORE UPDATE OR DELETE ON sales_refunds FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_inventory BEFORE UPDATE OR DELETE ON inventory_snapshots FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

CREATE FUNCTION allow_period_close_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP='DELETE' THEN
        RAISE EXCEPTION 'Historical periods cannot be deleted' USING ERRCODE='23514';
    END IF;
    IF OLD.valid_to IS NOT NULL OR NEW.valid_to IS NULL
       OR (to_jsonb(OLD) - 'valid_to') IS DISTINCT FROM (to_jsonb(NEW) - 'valid_to') THEN
        RAISE EXCEPTION 'Only closing an open period is permitted' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER preserve_price_history BEFORE UPDATE OR DELETE ON variant_price_history FOR EACH ROW EXECUTE FUNCTION allow_period_close_only();
CREATE TRIGGER preserve_cost_history BEFORE UPDATE OR DELETE ON variant_cost_history FOR EACH ROW EXECUTE FUNCTION allow_period_close_only();

CREATE FUNCTION validate_refund_limits() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    parent sales_orders%ROWTYPE;
    item sales_order_items%ROWTYPE;
    prior_quantity BIGINT;
    prior_amount NUMERIC;
    limit_amount NUMERIC;
BEGIN
    SELECT * INTO parent FROM sales_orders WHERE id=NEW.order_id FOR UPDATE;
    IF NOT FOUND OR parent.status <> 'COMPLETED' OR NEW.refunded_at < parent.placed_at THEN
        RAISE EXCEPTION 'Refund requires a completed order and valid timestamp' USING ERRCODE='23514';
    END IF;
    IF NEW.item_id IS NOT NULL THEN
        SELECT * INTO item FROM sales_order_items WHERE id=NEW.item_id AND order_id=NEW.order_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Refund line does not belong to order' USING ERRCODE='23503';
        END IF;
        SELECT coalesce(sum(quantity),0),coalesce(sum(amount),0) INTO prior_quantity,prior_amount
            FROM sales_refunds WHERE item_id=NEW.item_id;
        IF prior_quantity+NEW.quantity>item.quantity OR prior_amount+NEW.amount>item.line_net THEN
            RAISE EXCEPTION 'Refund exceeds purchased quantity or paid merchandise amount' USING ERRCODE='23514';
        END IF;
    ELSE
        limit_amount := CASE WHEN NEW.kind='SHIPPING' THEN parent.shipping_amount ELSE parent.tax_amount END;
        SELECT coalesce(sum(amount),0) INTO prior_amount FROM sales_refunds WHERE order_id=NEW.order_id AND kind=NEW.kind;
        IF limit_amount IS NULL OR prior_amount+NEW.amount>limit_amount THEN
            RAISE EXCEPTION 'Refund exceeds known shipping/tax amount' USING ERRCODE='23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER refund_limits BEFORE INSERT ON sales_refunds FOR EACH ROW EXECUTE FUNCTION validate_refund_limits();
