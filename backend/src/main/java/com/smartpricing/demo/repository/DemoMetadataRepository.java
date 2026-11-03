package com.smartpricing.demo.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartpricing.demo.dto.DemoSummary;
import com.smartpricing.demo.generator.*;
import java.sql.Date;
import java.util.*;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("demo")
public class DemoMetadataRepository {
    private final JdbcTemplate jdbc; private final ObjectMapper mapper;
    public DemoMetadataRepository(JdbcTemplate jdbc,ObjectMapper mapper) { this.jdbc=jdbc; this.mapper=mapper; }

    public DemoSummary existing() {
        var rows=jdbc.queryForList("SELECT summary::text FROM demo_control.seed_runs WHERE id=1",String.class);
        if(rows.isEmpty()) return null;
        try { return mapper.readValue(rows.getFirst(),DemoSummary.class); }
        catch(JsonProcessingException exception) { throw new IllegalStateException("Demo metadata could not be read.",exception); }
    }
    public void mapping(String key,String kind,UUID id,String scenario) {
        jdbc.update("INSERT INTO demo_control.catalog_mappings(logical_key,entity_kind,entity_id,scenario_id) VALUES (?,?,?,?)",key,kind,id,scenario);
    }
    public void completed(DemoSeedConfig config,DemoSummary summary,Map<String,Object> truth) {
        jdbc.update("INSERT INTO demo_control.seed_runs(id,generator_version,seed,reference_start,checksum,summary,ground_truth) VALUES (1,?,?,?,?,?::jsonb,?::jsonb)",
                DemoSeedConfig.VERSION,config.seed(),Date.valueOf(config.startDate()),summary.checksum(),json(summary),json(truth));
    }
    public String json(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch(JsonProcessingException exception) { throw new IllegalStateException("Demo metadata could not be serialized.",exception); }
    }
}
