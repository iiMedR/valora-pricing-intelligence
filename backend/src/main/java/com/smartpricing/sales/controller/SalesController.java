package com.smartpricing.sales.controller;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.history.dto.HistoryDtos.Source;
import com.smartpricing.sales.dto.SalesDtos.*;
import com.smartpricing.sales.service.SalesService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/v1/sales/orders")
public class SalesController {
    private final SalesService service;
    public SalesController(SalesService service) { this.service=service; }
    @GetMapping public PageView<OrderView> orders(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required=false) OrderStatus status,@RequestParam(required=false) Source source) { return service.orders(page,size,from,to,status,source); }
    @GetMapping("/{id}") public OrderDetail detail(@PathVariable UUID id) { return service.detail(id); }
    @PostMapping public ResponseEntity<OrderDetail> create(@Valid @RequestBody OrderWrite input) {
        var result=service.create(input); return ResponseEntity.status(result.created()?201:200).body(result.value());
    }
    @PostMapping("/{id}/refunds") public ResponseEntity<RefundView> refund(@PathVariable UUID id,@Valid @RequestBody RefundWrite input) {
        var result=service.refund(id,input); return ResponseEntity.status(result.created()?201:200).body(result.value());
    }
}
