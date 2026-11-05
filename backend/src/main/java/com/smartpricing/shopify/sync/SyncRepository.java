package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.*;
import com.smartpricing.common.ApiException;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SyncRepository {
    public record Job(UUID id,String shop,long generation,String kind,String state,Instant from,Instant to,int maxPages,int attemptPages,int attempts,Map<String,Integer> counts,List<String> warnings,String errorCode,Instant createdAt,Instant startedAt,Instant finishedAt){}
    public record Checkpoint(String resource,String cursor,boolean complete){}
    public record Mapping(UUID id,String hash,Long version){}
    private final JdbcTemplate jdbc;private final ObjectMapper mapper;
    public SyncRepository(JdbcTemplate jdbc,ObjectMapper mapper){this.jdbc=jdbc;this.mapper=mapper;}
    public Job job(UUID id){var rows=jdbc.query("SELECT * FROM shopify_sync_job WHERE id=?",this::row,id);if(rows.isEmpty())throw ApiException.missing("Sync job");return rows.getFirst();}
    public List<Job> jobs(int page,int size){if(page<0||page>100000||size<1||size>100)throw ApiException.invalid("Use page >=0 and size 1–100.");return jdbc.query("SELECT * FROM shopify_sync_job ORDER BY created_at DESC,id LIMIT ? OFFSET ?",this::row,size,(long)page*size);}
    public List<Checkpoint> checkpoints(UUID job){return jdbc.query("SELECT * FROM shopify_sync_checkpoint WHERE job_id=? ORDER BY resource",(rs,n)->new Checkpoint(rs.getString("resource"),rs.getString("cursor"),rs.getBoolean("complete")),job);}
    public UUID active(){var ids=jdbc.queryForList("SELECT id FROM shopify_sync_job WHERE state IN ('PENDING','RUNNING') ORDER BY created_at LIMIT 1",UUID.class);return ids.isEmpty()?null:ids.getFirst();}
    public Job latest(String shop,long generation){var rows=jdbc.query("SELECT * FROM shopify_sync_job WHERE shop_domain=? AND generation=? ORDER BY created_at DESC,id LIMIT 1",this::row,shop,generation);return rows.isEmpty()?null:rows.getFirst();}
    public void create(UUID id,String shop,long generation,String kind,Instant from,Instant to,int pages){
        jdbc.update("INSERT INTO shopify_sync_job(id,shop_domain,generation,kind,state,window_from,window_to,max_pages) VALUES(?,?,?,?,'PENDING',?,?,?)",id,shop,generation,kind,Timestamp.from(from),Timestamp.from(to),pages);
        jdbc.update("INSERT INTO shopify_sync_checkpoint(job_id,resource) VALUES(?,'CATALOG'),(?,'ORDERS')",id,id);
    }
    public Instant watermark(String shop){var dates=jdbc.query("SELECT through_time FROM shopify_sync_watermark WHERE shop_domain=?",(rs,n)->rs.getTimestamp(1).toInstant(),shop);return dates.isEmpty()?null:dates.getFirst();}
    public void running(UUID id){jdbc.update("UPDATE shopify_sync_job SET state='RUNNING',started_at=coalesce(started_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?",id);}
    public void progress(UUID id,String resource,String cursor,boolean complete,Map<String,Integer> counts,List<String>warnings){
        jdbc.update("UPDATE shopify_sync_checkpoint SET cursor=?,complete=? WHERE job_id=? AND resource=?",cursor,complete,id,resource);
        jdbc.update("UPDATE shopify_sync_job SET counts=?::jsonb,warnings=?::jsonb,attempt_pages=attempt_pages+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",json(counts),json(warnings),id);
    }
    public void finish(Job job){
        jdbc.update("UPDATE shopify_sync_job SET state='SUCCEEDED',finished_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,error_code=NULL WHERE id=?",job.id());
        // A bounded initial range does not claim coverage of later time. Never regress a completed watermark.
        jdbc.update("INSERT INTO shopify_sync_watermark(shop_domain,through_time,job_id) VALUES(?,?,?) ON CONFLICT(shop_domain) DO UPDATE SET through_time=excluded.through_time,job_id=excluded.job_id WHERE shopify_sync_watermark.through_time<excluded.through_time",job.shop(),Timestamp.from(job.to()),job.id());
    }
    public void fail(UUID id,String code){jdbc.update("UPDATE shopify_sync_job SET state=CASE WHEN counts<>'{}'::jsonb THEN 'PARTIAL' ELSE 'FAILED' END,error_code=?,finished_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state IN ('PENDING','RUNNING')",code,id);}
    public void resume(UUID id){jdbc.update("UPDATE shopify_sync_job SET state='PENDING',attempts=attempts+1,attempt_pages=0,error_code=NULL,finished_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",id);}
    public Mapping mapping(String shop,String type,String external){var rows=jdbc.query("SELECT local_id,payload_hash,local_version FROM shopify_source_mapping WHERE shop_domain=? AND resource=? AND external_id=?",(rs,n)->new Mapping(rs.getObject(1,UUID.class),rs.getString(2),(Long)rs.getObject(3)),shop,type,external);return rows.isEmpty()?null:rows.getFirst();}
    public void map(String shop,String type,String external,UUID local,String hash,Long version,UUID job,String sku,Instant updated){jdbc.update("INSERT INTO shopify_source_mapping(shop_domain,resource,external_id,local_id,payload_hash,local_version,seen_job,source_sku,source_updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(connection_id,shop_domain,resource,external_id) DO UPDATE SET local_id=excluded.local_id,payload_hash=excluded.payload_hash,local_version=excluded.local_version,seen_job=excluded.seen_job,source_sku=excluded.source_sku,source_updated_at=excluded.source_updated_at",shop,type,external,local,hash,version,job,sku,updated==null?null:Timestamp.from(updated));}
    private Job row(ResultSet rs,int index)throws SQLException{
        try{return new Job(rs.getObject("id",UUID.class),rs.getString("shop_domain"),rs.getLong("generation"),rs.getString("kind"),rs.getString("state"),rs.getTimestamp("window_from").toInstant(),rs.getTimestamp("window_to").toInstant(),rs.getInt("max_pages"),rs.getInt("attempt_pages"),rs.getInt("attempts"),mapper.readValue(rs.getString("counts"),new com.fasterxml.jackson.core.type.TypeReference<LinkedHashMap<String,Integer>>(){}),mapper.readValue(rs.getString("warnings"),new com.fasterxml.jackson.core.type.TypeReference<ArrayList<String>>(){}),rs.getString("error_code"),rs.getTimestamp("created_at").toInstant(),instant(rs,"started_at"),instant(rs,"finished_at"));}catch(java.io.IOException e){throw new SQLException("Invalid sync metadata");}
    }
    private Instant instant(ResultSet rs,String field)throws SQLException{var value=rs.getTimestamp(field);return value==null?null:value.toInstant();}
    private String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception ignored){throw new SyncFailure("SYNC_METADATA_INVALID");}}
}
