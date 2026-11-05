package com.smartpricing.shopify.sync;

/** Safe code only: provider payloads, URLs and exception causes never cross this boundary. */
public final class SyncFailure extends RuntimeException {
    public SyncFailure(String code) { super(code); }
}
