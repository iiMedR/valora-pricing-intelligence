package com.smartpricing.history.service;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.common.ApiException;
import com.smartpricing.history.dto.HistoryDtos.*;
import com.smartpricing.history.repository.HistoryRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.smartpricing.history.repository.HistoryRepository.timestamp;

@Service
@Transactional(readOnly=true)
public class VariantHistoryService {
    private final JdbcTemplate jdbc;
    private final HistoryRepository repository;
    private final HistorySupport support;
    public VariantHistoryService(JdbcTemplate jdbc,HistoryRepository repository,HistorySupport support) {
        this.jdbc=jdbc; this.repository=repository; this.support=support;
    }
    public PageView<PeriodView> periods(PeriodKind kind,UUID variant,int page,int size) { HistoryRules.page(page,size); return repository.periods(kind,variant,page,size); }
    public PageView<InventoryView> inventory(UUID variant,int page,int size) { HistoryRules.page(page,size); return repository.inventory(variant,page,size); }

    @Transactional
    public WriteResult<PeriodView> addPeriod(PeriodKind kind,UUID variant,PeriodWrite input) {
        support.lockKey(kind.name(),input.source(),input.externalReference());
        String hash=support.fingerprint(List.of(variant,input));
        var existing=repository.existing(repository.table(kind),input.source(),input.externalReference());
        if(existing!=null) { support.samePayload(existing.payloadHash(),hash); return new WriteResult<>(repository.period(kind,existing.id()),false); }
        BigDecimal amount=HistoryRules.money(input.amount(),false,kind==PeriodKind.PRICE);
        Instant from=HistoryRules.time(input.validFrom()),to=input.validTo()==null?null:HistoryRules.time(input.validTo());
        HistoryRules.period(from,to,input.quality()); support.currency(input.currencyCode()); support.lockVariant(variant);
        boolean current=input.quality()==Quality.VERIFIED_CHANGE && to==null;
        if(current) {
            Long version=jdbc.queryForObject("SELECT version FROM product_variants WHERE id=?",Long.class,variant);
            if(input.variantVersion()==null) throw ApiException.invalid("variantVersion is required for an authoritative current change.");
            if(!input.variantVersion().equals(version)) throw ApiException.conflict("STALE_VERSION","Variant changed. Reload before recording a current change.");
        }
        PeriodView created=insertPeriod(kind,variant,input,amount,from,to,hash,current);
        return new WriteResult<>(created,true);
    }

    private PeriodView insertPeriod(PeriodKind kind,UUID variant,PeriodWrite input,BigDecimal amount,Instant from,Instant to,String hash,boolean synchronize) {
        String table=repository.table(kind);
        if(input.quality()==Quality.VERIFIED_CHANGE) {
            if(to==null) {
                var open=jdbc.query("SELECT valid_from FROM "+table+" WHERE variant_id=? AND quality='VERIFIED_CHANGE' AND valid_to IS NULL",
                        (rs,n)->rs.getTimestamp(1).toInstant(),variant);
                if(!open.isEmpty() && !from.isAfter(open.getFirst())) throw ApiException.conflict("PERIOD_OVERLAP","A new current change must follow the existing open period.");
                jdbc.update("UPDATE "+table+" SET valid_to=? WHERE variant_id=? AND quality='VERIFIED_CHANGE' AND valid_to IS NULL",timestamp(from),variant);
            }
            Integer conflicts=jdbc.queryForObject("SELECT count(*) FROM "+table+" WHERE variant_id=? AND quality='VERIFIED_CHANGE' AND tstzrange(valid_from,valid_to,'[)') && tstzrange(?::timestamptz,?::timestamptz,'[)')",
                    Integer.class,variant,timestamp(from),timestamp(to));
            if(conflicts>0) throw ApiException.conflict("PERIOD_OVERLAP","Authoritative effective periods cannot overlap.");
        }
        if(synchronize && kind==PeriodKind.PRICE) {
            Boolean inBounds=jdbc.queryForObject("SELECT ?::numeric BETWEEN min_price AND max_price FROM product_variants WHERE id=?",Boolean.class,amount,variant);
            if(!Boolean.TRUE.equals(inBounds)) throw ApiException.conflict("PRICE_OUTSIDE_CONSTRAINTS","Current listed price must remain within the variant's minimum and maximum.");
        }
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO "+table+"(id,variant_id,amount,currency_code,valid_from,valid_to,source,quality,external_reference,payload_hash) VALUES (?,?,?,?,?,?,?,?,?,?)",
                id,variant,amount,input.currencyCode(),timestamp(from),timestamp(to),input.source().name(),input.quality().name(),input.externalReference(),hash);
        if(synchronize) jdbc.update("UPDATE product_variants SET "+(kind==PeriodKind.PRICE?"current_price":"cost_price")+"=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",amount,variant);
        return repository.period(kind,id);
    }

    @Transactional
    public WriteResult<InventoryView> addInventory(UUID variant,InventoryWrite input) {
        support.lockKey("INVENTORY",input.source(),input.externalReference());
        String hash=support.fingerprint(List.of(variant,input));
        var existing=repository.existing("inventory_snapshots",input.source(),input.externalReference());
        if(existing!=null) { support.samePayload(existing.payloadHash(),hash); return new WriteResult<>(repository.inventory(existing.id()),false); }
        repository.assertVariant(variant);
        Instant observed=HistoryRules.time(input.observedAt());
        HistoryRules.stockState(input.quantityAvailable(),input.quality());
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO inventory_snapshots(id,variant_id,observed_at,quantity_available,source,quality,external_reference,payload_hash) VALUES (?,?,?,?,?,?,?,?)",
                id,variant,timestamp(observed),input.quantityAvailable(),input.source().name(),input.quality().name(),input.externalReference(),hash);
        return new WriteResult<>(repository.inventory(id),true);
    }

    @Transactional
    public void recordCatalogChange(UUID variant,BigDecimal oldPrice,BigDecimal oldCost,BigDecimal price,BigDecimal cost) {
        String currency=jdbc.queryForObject("SELECT currency_code FROM business_settings WHERE id=1",String.class);
        Instant now=HistoryRules.time(Instant.now());
        for(PeriodKind kind:PeriodKind.values()) {
            BigDecimal old=kind==PeriodKind.PRICE?oldPrice:oldCost,value=kind==PeriodKind.PRICE?price:cost;
            if(old.compareTo(value)==0) continue;
            PeriodWrite input=new PeriodWrite(value,currency,now,null,Source.MANUAL,Quality.VERIFIED_CHANGE,"catalog-edit:"+UUID.randomUUID(),null);
            insertPeriod(kind,variant,input,value,now,null,support.fingerprint(input),false);
        }
    }
}
