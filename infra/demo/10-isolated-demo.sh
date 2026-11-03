#!/bin/sh
set -eu
: "${DEMO_DB_PASSWORD:?A separate demo application password is required}"
psql --no-psqlrc -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -v demo_password="$DEMO_DB_PASSWORD" <<'SQL'
CREATE ROLE smartpricing_demo LOGIN PASSWORD :'demo_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE DATABASE smartpricing_demo OWNER smartpricing_demo;
\connect smartpricing_demo
CREATE SCHEMA demo_control AUTHORIZATION smartpricing_demo_admin;
REVOKE ALL ON SCHEMA demo_control FROM PUBLIC;
GRANT USAGE ON SCHEMA demo_control TO smartpricing_demo;
CREATE TABLE demo_control.environment (
    id INTEGER PRIMARY KEY CHECK (id=1),
    marker TEXT NOT NULL
);
INSERT INTO demo_control.environment VALUES (1, 'SMARTPRICING_ISOLATED_SYNTHETIC_V1');
REVOKE ALL ON demo_control.environment FROM PUBLIC;
GRANT SELECT ON demo_control.environment TO smartpricing_demo;
CREATE TABLE demo_control.seed_runs (
    id INTEGER PRIMARY KEY CHECK (id=1),
    generator_version VARCHAR(32) NOT NULL,
    seed BIGINT NOT NULL,
    reference_start DATE NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    summary JSONB NOT NULL,
    ground_truth JSONB NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE demo_control.catalog_mappings (
    logical_key VARCHAR(160) PRIMARY KEY,
    entity_kind VARCHAR(16) NOT NULL CHECK (entity_kind IN ('CATEGORY','PRODUCT','VARIANT')),
    entity_id UUID NOT NULL,
    scenario_id VARCHAR(40)
);
GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON demo_control.seed_runs,demo_control.catalog_mappings TO smartpricing_demo;
SQL
