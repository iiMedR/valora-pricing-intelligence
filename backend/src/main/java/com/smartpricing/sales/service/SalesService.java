package com.smartpricing.sales.service;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.common.ApiException;
import com.smartpricing.history.dto.HistoryDtos.*;
import com.smartpricing.history.service.*;
import com.smartpricing.sales.dto.SalesDtos.*;
import com.smartpricing.sales.repository.SalesRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.smartpricing.history.repository.HistoryRepository.timestamp;

@Service
@Transactional(readOnly=true)
public class SalesService {
    private final JdbcTemplate jdbc; private final SalesRepository repository; private final HistorySupport support;
    public SalesService(JdbcTemplate jdbc,SalesRepository repository,HistorySupport support) { this.jdbc=jdbc; this.repository=repository; this.support=support; }
    public OrderDetail detail(UUID id) { return repository.detail(id); }
    public PageView<OrderView> orders(int page,int size,Instant from,Instant to,OrderStatus status,Source source) {
        HistoryRules.page(page,size); HistoryRules.dates(from,to); return repository.orders(page,size,from,to,status,source);
    }

    @Transactional
    public WriteResult<OrderDetail> create(OrderWrite input) {
        support.lockKey("ORDER",input.source(),input.externalReference());
        String hash=support.fingerprint(input);
        var existing=repository.existing(false,input.source(),input.externalReference());
        if(existing!=null) { support.samePayload(existing.hash(),hash); return new WriteResult<>(detail(existing.id()),false); }
        support.currency(input.currencyCode());
        Instant placed=HistoryRules.time(input.placedAt());
        Instant sourceUpdated=input.sourceUpdatedAt()==null?null:HistoryRules.time(input.sourceUpdatedAt());
        if(sourceUpdated!=null&&sourceUpdated.isBefore(placed)) throw ApiException.invalid("Source update cannot precede order placement.");
        if(input.lines()==null||input.lines().isEmpty()||input.lines().size()>100) throw ApiException.invalid("An order needs 1–100 lines.");
        BigDecimal subtotal=BigDecimal.ZERO,discount=BigDecimal.ZERO;
        Set<String> refs=new HashSet<>();
        List<LineView> snapshots=new ArrayList<>();
        for(LineWrite line:input.lines()) {
            BigDecimal net=HistoryRules.lineNet(line.unitPrice(),line.quantity(),line.discountAmount());
            HistoryRules.money(line.listUnitPrice(),true,false); HistoryRules.money(line.unitCost(),true,false);
            if(line.sourceLineReference()!=null&&(!refs.add(line.sourceLineReference())||line.sourceLineReference().isBlank()))
                throw ApiException.invalid("Line references must be nonblank and unique within the order.");
            var variants=jdbc.queryForList("SELECT sku,name FROM product_variants WHERE id=?",line.variantId());
            if(variants.isEmpty()) throw ApiException.missing("Variant");
            BigDecimal cost=line.unitCost(), effectiveCost=null;
            if(cost==null) {
                var costs=jdbc.query("SELECT amount FROM variant_cost_history WHERE variant_id=? AND quality='VERIFIED_CHANGE' AND valid_from<=? AND (valid_to IS NULL OR valid_to>?)",
                        (rs,n)->rs.getBigDecimal(1),line.variantId(),timestamp(placed),timestamp(placed));
                if(!costs.isEmpty()) effectiveCost=costs.getFirst();
            }
            var costSnapshot=HistoryRules.cost(cost,effectiveCost);
            snapshots.add(new LineView(UUID.randomUUID(),line.variantId(),variants.getFirst().get("sku").toString(),variants.getFirst().get("name").toString(),
                    line.quantity(),input.currencyCode(),HistoryRules.decimal(line.listUnitPrice()),HistoryRules.decimal(line.unitPrice()),
                    HistoryRules.decimal(line.discountAmount()),HistoryRules.decimal(net),HistoryRules.decimal(costSnapshot.amount()),costSnapshot.provenance(),line.sourceLineReference()));
            subtotal=subtotal.add(line.unitPrice().multiply(BigDecimal.valueOf(line.quantity()))); discount=discount.add(line.discountAmount());
        }
        subtotal=HistoryRules.money(subtotal,false,false); discount=HistoryRules.money(discount,false,false);
        BigDecimal shipping=HistoryRules.money(input.shippingAmount(),true,false),tax=HistoryRules.money(input.taxAmount(),true,false);
        if(shipping!=null&&tax!=null) HistoryRules.money(subtotal.subtract(discount).add(shipping).add(tax),false,false);
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO sales_orders(id,source,external_reference,payload_hash,placed_at,source_updated_at,status,currency_code,subtotal,discount_amount,shipping_amount,tax_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                id,input.source().name(),input.externalReference(),hash,timestamp(placed),timestamp(sourceUpdated),input.status().name(),input.currencyCode(),subtotal,discount,shipping,tax);
        for(LineView line:snapshots) jdbc.update("INSERT INTO sales_order_items(id,order_id,variant_id,source_line_reference,sku_snapshot,name_snapshot,quantity,currency_code,list_unit_price,unit_price,discount_amount,line_net,unit_cost,cost_provenance) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                line.id(),id,line.variantId(),line.sourceLineReference(),line.sku(),line.name(),line.quantity(),line.currencyCode(),
                decimal(line.listUnitPrice()),decimal(line.unitPrice()),decimal(line.discountAmount()),decimal(line.lineNet()),decimal(line.unitCost()),line.costProvenance());
        return new WriteResult<>(detail(id),true);
    }

    @Transactional
    public WriteResult<RefundView> refund(UUID orderId,RefundWrite input) {
        support.lockKey("REFUND",input.source(),input.externalReference());
        String hash=support.fingerprint(List.of(orderId,input));
        var existing=repository.existing(true,input.source(),input.externalReference());
        if(existing!=null) { support.samePayload(existing.hash(),hash); return new WriteResult<>(repository.refund(existing.id()),false); }
        if(jdbc.queryForList("SELECT id FROM sales_orders WHERE id=? FOR UPDATE",UUID.class,orderId).isEmpty()) throw ApiException.missing("Order");
        OrderDetail detail=detail(orderId);
        LineView line=detail.lines().stream().filter(item->item.id().equals(input.itemId())).findFirst().orElse(null);
        if(input.itemId()!=null&&line==null) throw ApiException.missing("Line in this order");
        var prior=detail.refunds().stream().filter(r -> input.itemId()!=null?input.itemId().equals(r.itemId()):r.kind()==input.kind()).toList();
        int priorQuantity=prior.stream().mapToInt(RefundView::quantity).sum();
        BigDecimal priorAmount=prior.stream().map(r->new BigDecimal(r.amount())).reduce(BigDecimal.ZERO,BigDecimal::add);
        SalesRules.refund(input,detail.order(),line,priorQuantity,priorAmount);
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO sales_refunds(id,order_id,item_id,source,external_reference,payload_hash,refunded_at,kind,quantity,amount,currency_code,reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                id,orderId,input.itemId(),input.source().name(),input.externalReference(),hash,timestamp(HistoryRules.time(input.refundedAt())),
                input.kind().name(),input.quantity(),input.amount(),input.currencyCode(),input.reason());
        return new WriteResult<>(repository.refund(id),true);
    }
    private BigDecimal decimal(String text) { return text==null?null:new BigDecimal(text); }
}
