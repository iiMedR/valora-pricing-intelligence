package com.smartpricing.sales.repository;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.history.dto.HistoryDtos.Source;
import com.smartpricing.history.service.HistoryRules;
import com.smartpricing.sales.dto.SalesDtos.*;
import java.sql.*;
import java.util.*;
import java.time.Instant;
import java.math.BigDecimal;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;
import static com.smartpricing.history.repository.HistoryRepository.*;

@Repository
public class SalesRepository {
    private final JdbcTemplate jdbc;
    private static final String SUMMARY = """
        SELECT o.*,
        coalesce((SELECT sum(amount) FROM sales_refunds r WHERE r.order_id=o.id AND r.item_id IS NOT NULL),0) merchandise_refunds,
        coalesce((SELECT sum(amount) FROM sales_refunds r WHERE r.order_id=o.id AND r.kind='SHIPPING'),0) shipping_refunds,
        coalesce((SELECT sum(amount) FROM sales_refunds r WHERE r.order_id=o.id AND r.kind='TAX'),0) tax_refunds,
        (SELECT count(*) FROM sales_order_items i WHERE i.order_id=o.id) item_count,
        coalesce((SELECT sum(quantity) FROM sales_order_items i WHERE i.order_id=o.id),0) total_quantity
        FROM sales_orders o
        """;
    public SalesRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public record Existing(UUID id,String hash) {}
    public Existing existing(boolean refund,Source source,String ref) {
        if(ref==null) return null;
        var rows=jdbc.query("SELECT id,payload_hash FROM "+(refund?"sales_refunds":"sales_orders")+" WHERE source=? AND external_reference=?",
                (rs,n)->new Existing(rs.getObject(1,UUID.class),rs.getString(2)),source.name(),ref);
        return rows.isEmpty()?null:rows.getFirst();
    }
    public OrderView order(UUID id) {
        var rows=jdbc.query(SUMMARY+" WHERE o.id=?",this::orderRow,id);
        if(rows.isEmpty()) throw com.smartpricing.common.ApiException.missing("Order");
        return rows.getFirst();
    }
    public OrderDetail detail(UUID id) {
        return new OrderDetail(order(id),jdbc.query("SELECT * FROM sales_order_items WHERE order_id=? ORDER BY id",this::lineRow,id),
                jdbc.query("SELECT * FROM sales_refunds WHERE order_id=? ORDER BY refunded_at,id",this::refundRow,id));
    }
    public RefundView refund(UUID id) { return jdbc.queryForObject("SELECT * FROM sales_refunds WHERE id=?",this::refundRow,id); }
    public PageView<OrderView> orders(int page,int size,Instant from,Instant to,OrderStatus status,Source source) {
        StringBuilder where=new StringBuilder(" WHERE 1=1"); List<Object> args=new ArrayList<>();
        if(from!=null) { where.append(" AND o.placed_at>=?"); args.add(timestamp(from)); }
        if(to!=null) { where.append(" AND o.placed_at<?"); args.add(timestamp(to)); }
        if(status!=null) { where.append(" AND o.status=?"); args.add(status.name()); }
        if(source!=null) { where.append(" AND o.source=?"); args.add(source.name()); }
        long count=jdbc.queryForObject("SELECT count(*) FROM sales_orders o"+where,Long.class,args.toArray());
        args.add(size); args.add((long)page*size);
        var rows=jdbc.query(SUMMARY+where+" ORDER BY o.placed_at DESC,o.id LIMIT ? OFFSET ?",this::orderRow,args.toArray());
        return new PageView<>(rows,page,size,count,(int)((count+size-1)/size));
    }
    private OrderView orderRow(ResultSet rs,int row) throws SQLException {
        BigDecimal subtotal=rs.getBigDecimal("subtotal"),discount=rs.getBigDecimal("discount_amount"),refund=rs.getBigDecimal("merchandise_refunds");
        BigDecimal shipping=rs.getBigDecimal("shipping_amount"),tax=rs.getBigDecimal("tax_amount"),net=subtotal.subtract(discount).subtract(refund);
        OrderStatus status=OrderStatus.valueOf(rs.getString("status"));
        return new OrderView(rs.getObject("id",UUID.class),Source.valueOf(rs.getString("source")),rs.getString("external_reference"),
                time(rs,"placed_at"),time(rs,"source_updated_at"),status,rs.getString("currency_code"),d(subtotal),d(discount),d(shipping),d(tax),
                d(refund),d(rs.getBigDecimal("shipping_refunds")),d(rs.getBigDecimal("tax_refunds")),d(net),d(HistoryRules.recognized(status,net)),
                shipping==null||tax==null?null:d(subtotal.subtract(discount).add(shipping).add(tax)),rs.getInt("item_count"),rs.getInt("total_quantity"),
                time(rs,"created_at"),time(rs,"updated_at"));
    }
    private LineView lineRow(ResultSet rs,int row) throws SQLException {
        return new LineView(rs.getObject("id",UUID.class),rs.getObject("variant_id",UUID.class),rs.getString("sku_snapshot"),rs.getString("name_snapshot"),
                rs.getInt("quantity"),rs.getString("currency_code"),d(rs.getBigDecimal("list_unit_price")),d(rs.getBigDecimal("unit_price")),
                d(rs.getBigDecimal("discount_amount")),d(rs.getBigDecimal("line_net")),d(rs.getBigDecimal("unit_cost")),
                rs.getString("cost_provenance"),rs.getString("source_line_reference"));
    }
    private RefundView refundRow(ResultSet rs,int row) throws SQLException {
        return new RefundView(rs.getObject("id",UUID.class),rs.getObject("order_id",UUID.class),rs.getObject("item_id",UUID.class),Source.valueOf(rs.getString("source")),
                rs.getString("external_reference"),time(rs,"refunded_at"),RefundKind.valueOf(rs.getString("kind")),rs.getInt("quantity"),
                d(rs.getBigDecimal("amount")),rs.getString("currency_code"),rs.getString("reason"),time(rs,"created_at"));
    }
    private String d(BigDecimal value) { return HistoryRules.decimal(value); }
}
