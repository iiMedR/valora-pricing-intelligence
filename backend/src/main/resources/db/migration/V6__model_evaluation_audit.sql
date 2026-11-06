-- Explicit evaluation snapshots only; no business history or demo data backfill.
CREATE TABLE model_evaluation_audit (
    id UUID PRIMARY KEY,
    variant_id UUID NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
    fingerprint CHAR(64) NOT NULL UNIQUE,
    model_version TEXT NOT NULL,
    configuration JSONB NOT NULL,
    result JSONB NOT NULL,
    outcome_status TEXT NOT NULL DEFAULT 'NOT_MEASURED' CHECK (outcome_status='NOT_MEASURED')
);
CREATE INDEX model_evaluation_variant_time ON model_evaluation_audit(variant_id,evaluated_at DESC,id);
CREATE FUNCTION refuse_model_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Model evaluation history is append-only';
END;
$$;
CREATE TRIGGER model_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON model_evaluation_audit
FOR EACH STATEMENT EXECUTE FUNCTION refuse_model_audit_mutation();
