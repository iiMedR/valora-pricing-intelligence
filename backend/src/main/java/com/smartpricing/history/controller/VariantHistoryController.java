package com.smartpricing.history.controller;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.history.dto.HistoryDtos.*;
import com.smartpricing.history.service.VariantHistoryService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/products/variants/{variantId}")
public class VariantHistoryController {
    private final VariantHistoryService service;
    public VariantHistoryController(VariantHistoryService service) { this.service=service; }
    @GetMapping("/price-history") public PageView<PeriodView> prices(@PathVariable UUID variantId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.periods(PeriodKind.PRICE,variantId,page,size); }
    @GetMapping("/cost-history") public PageView<PeriodView> costs(@PathVariable UUID variantId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.periods(PeriodKind.COST,variantId,page,size); }
    @GetMapping("/inventory-history") public PageView<InventoryView> inventory(@PathVariable UUID variantId,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.inventory(variantId,page,size); }
    @PostMapping("/price-history") public ResponseEntity<PeriodView> price(@PathVariable UUID variantId,@Valid @RequestBody PeriodWrite input) { var result=service.addPeriod(PeriodKind.PRICE,variantId,input); return ResponseEntity.status(result.created()?201:200).body(result.value()); }
    @PostMapping("/cost-history") public ResponseEntity<PeriodView> cost(@PathVariable UUID variantId,@Valid @RequestBody PeriodWrite input) { var result=service.addPeriod(PeriodKind.COST,variantId,input); return ResponseEntity.status(result.created()?201:200).body(result.value()); }
    @PostMapping("/inventory-history") public ResponseEntity<InventoryView> inventory(@PathVariable UUID variantId,@Valid @RequestBody InventoryWrite input) { var result=service.addInventory(variantId,input); return ResponseEntity.status(result.created()?201:200).body(result.value()); }
}
