package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.smartpricing.common.ApiException;
import com.smartpricing.demo.config.DemoSafetyGuard;
import com.smartpricing.shopify.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

@Service
public class SyncCoordinator {
    private final SyncRepository repository;private final ShopifyRepository connections;private final SyncCredentials credentials;private final ShopifyGraphQl graph;private final SyncMapper mapping;private final DemoSafetyGuard guard;private final TransactionTemplate tx;private final DataSource source;private final ObjectMapper mapper;private final boolean worker;private final ShopifySettings settings;
    public SyncCoordinator(SyncRepository repository,ShopifyRepository connections,SyncCredentials credentials,ShopifyGraphQl graph,SyncMapper mapping,DemoSafetyGuard guard,PlatformTransactionManager manager,DataSource source,ObjectMapper mapper,@Value("${app.shopify.sync.worker-enabled:true}")boolean worker,ShopifySettings settings){this.repository=repository;this.connections=connections;this.credentials=credentials;this.graph=graph;this.mapping=mapping;this.guard=guard;this.tx=new TransactionTemplate(manager);this.source=source;this.mapper=mapper;this.worker=worker;this.settings=settings;}
    public record Start(String kind,Instant from,Instant to,Integer maxPages,UUID resumeJobId){}
    public record Status(boolean demo,boolean connected,String shop,Instant lastSuccessfulSync,SyncRepository.Job latest,List<SyncRepository.Checkpoint> checkpoints,List<String> requiredScopes,String liveValidation){}
    private void normal(){if(guard.demoRequested())throw new ApiException(org.springframework.http.HttpStatus.FORBIDDEN,"DEMO_SYNC_DISABLED","The synthetic demo cannot import real store data.");}
    public SyncRepository.Job start(Start input){
        normal();return tx.execute(status->{
            var connection=connections.connection(true);if(!settings.enabled()||!connection.status().equals("CONNECTED"))throw ApiException.conflict("STORE_NOT_CONNECTED","Configure and connect Shopify before importing data.");
            if(repository.active()!=null)throw ApiException.conflict("SYNC_ALREADY_ACTIVE","A sync job is already pending or running.");
            if(input.resumeJobId()!=null){var job=repository.job(input.resumeJobId());if(!job.shop().equals(connection.shop())||job.generation()!=connection.generation())throw ApiException.conflict("CONNECTION_CHANGED","This job belongs to an earlier installation.");if(!Set.of("PARTIAL","FAILED").contains(job.state()))throw ApiException.conflict("JOB_NOT_RESUMABLE","Only failed or partial jobs can resume.");repository.resume(job.id());return repository.job(job.id());}
            String kind=input.kind();if(!Set.of("INITIAL","INCREMENTAL").contains(kind==null?"":kind))throw ApiException.invalid("kind must be INITIAL or INCREMENTAL.");
            Instant to=input.to()==null?Instant.now():input.to(),from=input.from();Instant watermark=repository.watermark(connection.shop());
            if(kind.equals("INCREMENTAL")){if(watermark==null)throw ApiException.conflict("INITIAL_SYNC_REQUIRED","Complete a bounded historical import first.");if(from!=null)throw ApiException.invalid("Incremental start is derived from the saved watermark.");from=watermark.minus(Duration.ofHours(48));}
            if(from==null||!to.isAfter(from)||to.isAfter(Instant.now())||Duration.between(from,to).compareTo(Duration.ofDays(31))>0)throw ApiException.invalid("Use a nonfuture UTC range of at most 31 days.");
            if(from.isBefore(Instant.now().minus(Duration.ofDays(59))))throw ApiException.invalid("This installation requests standard read_orders only. Choose the recent 59 days; older history requires read_all_orders approval and a separately authorized scope change.");
            int pages=input.maxPages()==null?100:input.maxPages();if(pages<1||pages>200)throw ApiException.invalid("maxPages must be 1–200 per attempt.");
            UUID id=UUID.randomUUID();repository.create(id,connection.shop(),connection.generation(),kind,from,to,pages);return repository.job(id);
        });
    }
    public Status status(){
        if(guard.demoRequested())return new Status(true,false,null,null,null,List.of(),List.of(),"LIVE_SHOPIFY_NOT_VERIFIED");
        var connection=connections.connection(false);var latest=connection.shop()==null?null:repository.latest(connection.shop(),connection.generation());
        return new Status(false,settings.enabled()&&connection.status().equals("CONNECTED"),connection.shop(),connection.shop()==null?null:repository.watermark(connection.shop()),latest,latest==null?List.of():repository.checkpoints(latest.id()),ShopifySettings.SCOPES,"LIVE_SHOPIFY_NOT_VERIFIED");
    }
    public List<SyncRepository.Job> jobs(int page,int size){normal();return repository.jobs(page,size);}
    public Map<String,Object> job(UUID id){normal();return Map.of("job",repository.job(id),"checkpoints",repository.checkpoints(id));}
    @Scheduled(fixedDelayString="${app.shopify.sync.poll-ms:1000}") public void tick(){if(worker&&!guard.demoRequested())runOne();}
    /** One page per tick. A session advisory lock serializes workers, including after process restart. */
    public void runOne(){
        if(guard.demoRequested())return;
        try(var lease=source.getConnection();var sql=lease.createStatement()){
            try(var locked=sql.executeQuery("SELECT pg_try_advisory_lock(831472819)")){locked.next();if(!locked.getBoolean(1))return;}
            try{UUID id=repository.active();if(id!=null)process(id);}finally{sql.execute("SELECT pg_advisory_unlock(831472819)");}
        }catch(SQLException ignored){/* No raw JDBC errors/provider payloads in logs. Next tick can recover. */}
    }
    private void process(UUID id){
        try{
            var job=repository.job(id);repository.running(id);
            var point=repository.checkpoints(id).stream().filter(c->!c.complete()).findFirst().orElse(null);
            if(point==null){tx.executeWithoutResult(status->{sameConnection(job);repository.finish(job);});return;}
            if(job.attemptPages()>=job.maxPages())throw new SyncFailure("PAGE_BUDGET_REACHED_RESUME_REQUIRED");
            var access=credentials.access(job.shop(),job.generation());
            Map<String,Object> variables=new HashMap<>();variables.put("after",point.cursor());
            String query=SyncQueries.CATALOG,field="productVariants";
            if(point.resource().equals("ORDERS")){query=SyncQueries.ORDERS;field="orders";variables.put("filter",(job.kind().equals("INITIAL")?"created_at": "updated_at")+":>="+job.from()+" "+(job.kind().equals("INITIAL")?"created_at":"updated_at")+":<"+job.to());}
            JsonNode data=graph.query(access.shop(),access.token(),query,variables),page=data.path(field);
            if(!page.path("nodes").isArray()||!page.path("pageInfo").has("hasNextPage"))throw new SyncFailure("GRAPHQL_INVALID_RESPONSE");
            boolean more=page.path("pageInfo").path("hasNextPage").asBoolean();String cursor=page.path("pageInfo").path("endCursor").isNull()?null:page.path("pageInfo").path("endCursor").asText(null);
            if(more&&(cursor==null||cursor.isBlank()||cursor.equals(point.cursor())||cursor.length()>4096))throw new SyncFailure("INVALID_PAGINATION_CURSOR");
            if(point.resource().equals("CATALOG")){
                String currency=tx.execute(s->new org.springframework.jdbc.core.JdbcTemplate(source).queryForObject("SELECT currency_code FROM business_settings WHERE id=1",String.class));
                if(!Objects.equals(currency,data.path("shop").path("currencyCode").asText()))throw new SyncFailure("UNSUPPORTED_CURRENCY");
                for(JsonNode node:page.path("nodes"))hydrateInventory(access,(ObjectNode)node);
            }else{
                for(JsonNode node:page.path("nodes")){
                    if(!node.path("refunds").isArray()||node.path("refunds").size()>100)throw new SyncFailure("REFUND_COUNT_LIMIT_REACHED");
                    ArrayNode refunds=mapper.createArrayNode();
                    for(JsonNode refund:node.path("refunds")){
                        var variablesForRefund=Map.<String,Object>of("id",SyncRules.id(refund));
                        JsonNode hydrated=graph.query(access.shop(),access.token(),SyncQueries.REFUND,variablesForRefund).path("node");if(!hydrated.isObject())throw new SyncFailure("REFUND_RESPONSE_INVALID");
                        // Keep each nested connection in a separate bounded query rather than summing three large connection costs.
                        ((ObjectNode)hydrated).set("refundShippingLines",graph.query(access.shop(),access.token(),SyncQueries.REFUND_SHIPPING,variablesForRefund).path("node").path("refundShippingLines"));
                        ((ObjectNode)hydrated).set("transactions",graph.query(access.shop(),access.token(),SyncQueries.REFUND_TRANSACTIONS,variablesForRefund).path("node").path("transactions"));refunds.add(hydrated);
                    }
                    ((ObjectNode)node).set("refunds",refunds);
                }
            }
            tx.executeWithoutResult(status->{
                sameConnection(job); // HTTP happens outside the write transaction; disconnect/reconnect invalidates this page.
                var counts=new LinkedHashMap<>(job.counts());var warnings=new ArrayList<>(job.warnings());
                SyncMapper.warn(warnings,"CURRENT_SNAPSHOTS_NOT_HISTORICAL_PRICE_COST_OR_STOCK");
                SyncMapper.warn(warnings,"STANDARD_ORDER_ACCESS_RECENT_60_DAYS_ONLY");
                if(data.path("_costUnavailable").asBoolean())SyncMapper.warn(warnings,"COST_PERMISSION_UNAVAILABLE");
                for(JsonNode node:page.path("nodes")){if(point.resource().equals("CATALOG"))mapping.catalog(job,node,counts,warnings);else mapping.order(job,node,counts,warnings);}
                if(point.resource().equals("CATALOG")&&!more)mapping.archiveMissing(job,warnings);
                repository.progress(id,point.resource(),cursor,!more,counts,warnings);
            });
        }catch(SyncFailure safe){repository.fail(id,safe.getMessage());}
        catch(RuntimeException ignored){repository.fail(id,"IMPORT_VALIDATION_OR_PERSISTENCE_CONFLICT");}
    }
    private void sameConnection(SyncRepository.Job job){var current=connections.connection(true);if(!current.status().equals("CONNECTED")||!Objects.equals(current.shop(),job.shop())||current.generation()!=job.generation())throw new SyncFailure("CONNECTION_CHANGED_OR_DISCONNECTED");}
    private void hydrateInventory(SyncCredentials.Access access,ObjectNode variant){
        JsonNode item=variant.path("inventoryItem");if(!item.path("tracked").asBoolean())return;String id=SyncRules.id(item),cursor=null;ArrayNode levels=mapper.createArrayNode();
        for(int page=0;page<10;page++){
            Map<String,Object> variables=new HashMap<>();variables.put("id",id);variables.put("after",cursor);
            JsonNode data=graph.query(access.shop(),access.token(),SyncQueries.INVENTORY,variables).path("inventoryItem").path("inventoryLevels");
            if(!data.path("nodes").isArray()||!data.path("pageInfo").has("hasNextPage"))throw new SyncFailure("INVENTORY_PERMISSION_OR_RESPONSE_INVALID");
            data.path("nodes").forEach(levels::add);
            if(!data.path("pageInfo").path("hasNextPage").asBoolean()){
                // A level set is not ordered business evidence. Normalize before hashing/deduplication.
                var ordered=new TreeMap<String,JsonNode>();
                for(JsonNode level:levels)if(ordered.put(SyncRules.id(level.path("location")),level)!=null)throw new SyncFailure("DUPLICATE_INVENTORY_LOCATION");
                variant.set("_levels",mapper.valueToTree(ordered.values()));return;
            }
            String next=data.path("pageInfo").path("endCursor").asText();if(next.isBlank()||next.equals(cursor))throw new SyncFailure("INVALID_PAGINATION_CURSOR");cursor=next;
        }
        throw new SyncFailure("INVENTORY_LOCATION_LIMIT_REACHED");
    }
}

@Configuration
@EnableScheduling
class SyncScheduling {}
