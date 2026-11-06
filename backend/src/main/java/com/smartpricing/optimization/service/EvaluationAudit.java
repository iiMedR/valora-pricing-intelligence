package com.smartpricing.optimization.service;

import com.fasterxml.jackson.databind.*;
import com.smartpricing.forecasting.service.*;
import com.smartpricing.optimization.repository.OptimizationRepository;
import com.smartpricing.demo.config.DemoSafetyGuard;
import com.smartpricing.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class EvaluationAudit {
    private final com.smartpricing.forecasting.repository.DemandRepository identities;private final ForecastService forecasts;private final OptimizationService optimization;private final OptimizationRepository markets;
    private final ForecastSettings forecastSettings;private final OptimizationSettings optimizationSettings;private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final DemoSafetyGuard guard;
    public EvaluationAudit(com.smartpricing.forecasting.repository.DemandRepository identities,ForecastService forecasts,OptimizationService optimization,OptimizationRepository markets,ForecastSettings forecastSettings,OptimizationSettings optimizationSettings,JdbcTemplate jdbc,ObjectMapper mapper,DemoSafetyGuard guard){this.identities=identities;this.forecasts=forecasts;this.optimization=optimization;this.markets=markets;this.forecastSettings=forecastSettings;this.optimizationSettings=optimizationSettings;this.jdbc=jdbc;this.mapper=mapper.copy().configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS,true).configure(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY,true);this.guard=guard;}
    public record Snapshot(UUID id,UUID variantId,Instant evaluatedAt,String fingerprint,String modelVersion,JsonNode configuration,JsonNode result,String outcomeStatus) {}
    public record History(List<Snapshot> content,int page,int size,long totalElements) {}
    @Transactional(isolation=Isolation.REPEATABLE_READ)
    public Snapshot save(UUID variant,LocalDate start,LocalDate end,int horizon) {
        if(guard.demoRequested())throw ApiException.conflict("DEMO_READ_ONLY","Synthetic demo evaluations cannot be saved.");
        LocalDate until=end==null?LocalDate.now(ZoneOffset.UTC):end;
        var input=forecasts.input(variant,start==null?until.minusDays(365):start,until);
        var market=markets.inputs(List.of(variant),until.atStartOfDay(ZoneOffset.UTC).toInstant().minusNanos(1000),input.window().currencyCode()).get(variant);
        var result=optimization.evaluate(input,market,horizon);
        String config=json(Map.of("forecast",forecastSettings,"optimization",optimizationSettings,"estimator",ControlledElasticity.VERSION,"auditContract","evaluation-audit-v1","minimumResidualLogPriceSd",.03,"minimumObservationsPerParameter",10));
        String fingerprint=hash(json(input)+"\n"+json(market)+"\n"+horizon+"\n"+config);
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO model_evaluation_audit(id,variant_id,fingerprint,model_version,configuration,result) VALUES(?,?,?,?,CAST(? AS jsonb),CAST(? AS jsonb)) ON CONFLICT(fingerprint) DO NOTHING",id,variant,fingerprint,ControlledElasticity.VERSION,config,json(result));
        return jdbc.query("SELECT * FROM model_evaluation_audit WHERE fingerprint=?",(rs,n)->read(rs),fingerprint).getFirst();
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public History history(UUID variant,int page,int size){
        if(page<0||page>100000||size<1||size>10)throw ApiException.invalid("page must be 0–100000 and size 1–10.");
        // Require an existing variant; snapshots intentionally have no cascading business FK.
        identities.identity(variant);
        long total=jdbc.queryForObject("SELECT count(*) FROM model_evaluation_audit WHERE variant_id=?",Long.class,variant);
        return new History(jdbc.query("SELECT * FROM model_evaluation_audit WHERE variant_id=? ORDER BY evaluated_at DESC,id LIMIT ? OFFSET ?",(rs,n)->read(rs),variant,size,(long)page*size),page,size,total);
    }
    private Snapshot read(java.sql.ResultSet rs)throws java.sql.SQLException{return new Snapshot(rs.getObject("id",UUID.class),rs.getObject("variant_id",UUID.class),rs.getTimestamp("evaluated_at").toInstant(),rs.getString("fingerprint"),rs.getString("model_version"),tree(rs.getString("configuration")),tree(rs.getString("result")),rs.getString("outcome_status"));}
    private JsonNode tree(String value){try{return mapper.readTree(value);}catch(Exception e){throw new IllegalStateException("Cannot decode evaluation snapshot",e);}}
    private String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Cannot encode evaluation snapshot",e);}}
    private String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
