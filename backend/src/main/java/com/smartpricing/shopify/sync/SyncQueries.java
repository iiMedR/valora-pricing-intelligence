package com.smartpricing.shopify.sync;

public final class SyncQueries {
    private SyncQueries(){}
    public static final String MONEY="{ shopMoney { amount currencyCode } }";
    public static final String CATALOG="""
        query Catalog($after:String) {
          shop { currencyCode }
          productVariants(first:10,after:$after,sortKey:ID) {
            nodes { id title sku price updatedAt product { id title status updatedAt }
              inventoryItem { id tracked unitCost { amount currencyCode } }
            } pageInfo { hasNextPage endCursor }
          }
        }
        """;
    public static final String INVENTORY="""
        query Inventory($id:ID!,$after:String) {
          inventoryItem(id:$id) { inventoryLevels(first:100,after:$after) {
            nodes { id updatedAt location { id } quantities(names:["available"]) { name quantity } }
            pageInfo { hasNextPage endCursor }
          } }
        }
        """;
    public static final String ORDERS="""
        query Orders($after:String,$filter:String!) {
          orders(first:1,after:$after,query:$filter,sortKey:UPDATED_AT) {
            nodes { id createdAt updatedAt cancelledAt test currencyCode taxesIncluded
              displayFinancialStatus displayFulfillmentStatus
              totalShippingPriceSet { shopMoney { amount currencyCode } }
              totalTaxSet { shopMoney { amount currencyCode } }
              lineItems(first:100) { nodes { id title sku quantity unfulfilledQuantity
                variant { id }
                originalUnitPriceSet { shopMoney { amount currencyCode } }
                discountAllocations { allocatedAmountSet { shopMoney { amount currencyCode } } }
              } pageInfo { hasNextPage endCursor } }
              refunds { id }
            } pageInfo { hasNextPage endCursor }
          }
        }
        """;
    public static final String REFUND="""
        query RefundDetails($id:ID!) { node(id:$id) { ... on Refund {
          id createdAt processedAt totalRefundedSet { shopMoney { amount currencyCode } }
          refundLineItems(first:100) { nodes { id quantity restockType lineItem { id }
            subtotalSet { shopMoney { amount currencyCode } }
            totalTaxSet { shopMoney { amount currencyCode } }
          } pageInfo { hasNextPage endCursor } }
        } } }
        """;
    public static final String REFUND_SHIPPING="""
        query RefundShipping($id:ID!) { node(id:$id) { ... on Refund {
          refundShippingLines(first:100) { nodes { id subtotalAmountSet { shopMoney { amount currencyCode } }
            taxAmountSet { shopMoney { amount currencyCode } } } pageInfo { hasNextPage endCursor } }
        } } }
        """;
    public static final String REFUND_TRANSACTIONS="""
        query RefundTransactions($id:ID!) { node(id:$id) { ... on Refund {
          transactions(first:100) { nodes { status kind amountSet { shopMoney { amount currencyCode } } } pageInfo { hasNextPage endCursor } }
        } } }
        """;
}
