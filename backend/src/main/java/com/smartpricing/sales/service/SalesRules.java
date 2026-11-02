package com.smartpricing.sales.service;

import com.smartpricing.common.ApiException;
import com.smartpricing.sales.dto.SalesDtos.*;
import java.math.BigDecimal;
import static com.smartpricing.history.service.HistoryRules.*;

public final class SalesRules {
    private SalesRules() {}
    public static void refund(RefundWrite input,OrderView order,LineView line,int priorQuantity,BigDecimal priorAmount) {
        money(input.amount(),false,false); time(input.refundedAt());
        if(order.status()!=OrderStatus.COMPLETED || input.refundedAt().isBefore(order.placedAt()))
            throw ApiException.conflict("INVALID_REFUND","Refunds require a completed order and timestamp on or after placement.");
        if(!input.currencyCode().equals(order.currencyCode())) throw ApiException.invalid("Refund currency must match the order.");
        boolean merchandise=input.kind()==RefundKind.LINE_RETURN||input.kind()==RefundKind.FINANCIAL_ADJUSTMENT;
        if(merchandise) {
            if(line==null) throw ApiException.invalid("A refund must reference a line from this order.");
            if(input.kind()==RefundKind.LINE_RETURN ? input.quantity()<=0 : input.quantity()!=0||input.amount().signum()==0)
                throw ApiException.invalid("Returns require positive quantity; financial-only adjustments require zero quantity and positive amount.");
            if((long)priorQuantity+input.quantity()>line.quantity() || priorAmount.add(input.amount()).compareTo(new BigDecimal(line.lineNet()))>0)
                throw ApiException.conflict("REFUND_LIMIT","Cumulative refund exceeds purchased quantity or paid line amount.");
        } else {
            if(input.itemId()!=null||input.quantity()!=0||input.amount().signum()<=0) throw ApiException.invalid("Shipping/tax adjustments require no line, zero quantity, and positive amount.");
            String cap=input.kind()==RefundKind.SHIPPING?order.shippingAmount():order.taxAmount();
            if(cap==null||priorAmount.add(input.amount()).compareTo(new BigDecimal(cap))>0)
                throw ApiException.conflict("REFUND_LIMIT","Refund exceeds the known shipping/tax amount.");
        }
    }
}
