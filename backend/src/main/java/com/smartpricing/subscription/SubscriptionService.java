package com.smartpricing.subscription;

import com.smartpricing.common.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly=true)
public class SubscriptionService {
    private final JdbcTemplate jdbc;
    private final BusinessMode mode;
    private final ObjectMapper mapper;
    public SubscriptionService(JdbcTemplate jdbc,BusinessMode mode,ObjectMapper mapper) { this.jdbc=jdbc;this.mode=mode;this.mapper=mapper; }
    // A deliberately fixed, versioned manual envelope. No customer or payment credentials.
    public record Operation(int templateVersion,String sourceId,String type,String planId,String name,
        String priceId,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,String currency,String interval,LocalDate effectiveDate,
        String subscriptionId,String chargeId) {}
    public record Receipt(String status,String sourceId,String message) {}
    public record Price(String id,String planId,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,String currency,String interval,LocalDate effectiveDate) {
        BigDecimal monthly() { return interval.equals("YEARLY")?amount.divide(BigDecimal.valueOf(12),12,RoundingMode.HALF_UP):amount; }
    }
    public record Event(String sourceId,String subscriptionId,String kind,LocalDate date,String priceId) {}
    public record Payment(String sourceId,String subscriptionId,String kind,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal amount,String currency,LocalDate date,String chargeId) {}
    public record Plan(String id,String name,boolean archived,List<Price> prices,long activeSubscriptions,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal mrr) {}
    public record Subscriber(String id,String plan,String interval,String status,LocalDate since,LocalDate scheduledEnd,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal mrr,String currency) {}
    public record Page<T>(List<T> content,int page,int size,long totalElements) {}
    public record Point(LocalDate date,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal mrr) {}
    public record PlanPoint(LocalDate date,long activePaidSubscriptions,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal mrr) {}
    public record PlanHistory(String planId,LocalDate start,LocalDate asOf,String currency,String coverage,List<PlanPoint> trend) {}
    public record Movement(@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal beginning,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal newMrr,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal expansion,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal contraction,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal churned,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal reactivation,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal ending,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal reconciliationDifference) {}
    public record Metrics(LocalDate start,LocalDate asOf,String currency,String coverage,long activePaidSubscriptions,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal mrr,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal arr,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal revenuePerPaidSubscription,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal collectedNetCash,
        long beginningPaidSubscriptions,long endedBeginningSubscriptions,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal subscriptionChurnPercent,
        @JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal grossRevenueChurnPercent,@JsonFormat(shape=JsonFormat.Shape.STRING) BigDecimal netRevenueChurnPercent,Movement movement,List<Point> trend) {}
    public String currency() { return jdbc.queryForObject("SELECT currency_code FROM business_settings WHERE id=1",String.class); }
    private void lock() { mode.requireSaas();jdbc.queryForObject("SELECT id FROM business_settings WHERE id=1 FOR UPDATE",Long.class); }
    private static void id(String value) { if(value==null||!value.matches("[A-Za-z0-9_-]{1,64}")) throw ApiException.invalid("Use opaque source IDs: 1–64 letters, digits, underscores or hyphens; no names or emails."); }
    private static void require(boolean ok,String message) { if(!ok)throw ApiException.invalid(message); }
    private String canonical(Operation o) {
        try { return mapper.writeValueAsString(o); } catch(Exception e) { throw ApiException.invalid("Invalid operation."); }
    }
    private boolean validate(Operation o) {
        require(o!=null&&o.templateVersion()==1,"Use manual template version 1."); id(o.sourceId());
        require(o.effectiveDate()!=null&&!o.effectiveDate().isBefore(LocalDate.of(2000,1,1))&&!o.effectiveDate().isAfter(LocalDate.now(ZoneOffset.UTC).plusYears(5)),"Date must be between 2000 and five years from today.");
        var existing=jdbc.queryForList("SELECT payload FROM subscription_ingestion WHERE source_id=?",String.class,o.sourceId());
        if(!existing.isEmpty()) {
            if(!existing.getFirst().equals(canonical(o)))throw ApiException.conflict("SOURCE_REPLAY_CONFLICT","Source ID already exists with different content; history was not changed.");
            return true;
        }
        require(canonical(o).length()<=2048,"Entry exceeds the bounded manual template.");
        require(jdbc.queryForObject("SELECT count(*) FROM subscription_ingestion",Long.class)<2000,"This manual workspace supports at most 2,000 operations. A bulk history pipeline is not available.");
        require(o.type()!=null,"Choose an operation type.");
        Set<String> allowed=new HashSet<>(Set.of("templateVersion","sourceId","type","effectiveDate"));
        allowed.addAll(switch(o.type()) {
            case "PLAN" -> Set.of("planId","name","priceId","amount","currency","interval");
            case "ARCHIVE" -> Set.of("planId");
            case "PAID" -> Set.of("subscriptionId","amount","currency");
            case "REFUND" -> Set.of("subscriptionId","amount","currency","chargeId");
            default -> Set.of("subscriptionId","priceId");
        });
        var tree=mapper.valueToTree(o);
        tree.fields().forEachRemaining(field->{require(field.getValue().isNull()||allowed.contains(field.getKey()),"Omit fields unrelated to the selected record type.");});
        switch(o.type()) {
            case "PLAN" -> {
                id(o.planId());id(o.priceId());
                require(o.name()!=null&&o.name().trim().length()>=2&&o.name().length()<=120&&!o.name().contains("@"),"Plan name must have 2–120 characters and no email address.");
                money(o); require(Set.of("MONTHLY","YEARLY").contains(Objects.toString(o.interval(),"")),"Only monthly and yearly billing are supported.");
                require(prices().stream().noneMatch(p->p.id().equals(o.priceId())||(p.planId().equals(o.planId())&&p.effectiveDate().equals(o.effectiveDate()))),"Price ID and plan effective date must be new; historical prices cannot be overwritten.");
                var names=jdbc.queryForList("SELECT name FROM subscription_plans WHERE id=?",String.class,o.planId());
                require(names.isEmpty()||names.getFirst().equals(o.name().trim()),"Existing plan name is immutable; use its exact name for a new price version.");
                require(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE id=? AND archived)",Boolean.class,o.planId())),"Archived plans cannot receive new prices.");
            }
            case "ARCHIVE" -> { id(o.planId()); require(jdbc.queryForObject("SELECT count(*) FROM subscription_plans WHERE id=?",Long.class,o.planId())==1,"Plan not found."); }
            case "START","CHANGE","CANCEL","END","REACTIVATE" -> validateEvent(o);
            case "PAID","REFUND" -> validatePayment(o);
            default -> throw ApiException.invalid("Unsupported operation type.");
        }
        return false;
    }
    private void money(Operation o) {
        require(o.amount()!=null&&o.amount().signum()>0&&o.amount().scale()<=4&&o.amount().precision()<=19&&o.amount().compareTo(new BigDecimal("999999999999999.9999"))<=0,"Amount must be positive with at most 4 decimal places and 15 integer digits.");
        require(currency().equals(o.currency()),"Currency must match the installation. No currency conversion is supported.");
    }
    private void validateEvent(Operation o) {
        id(o.subscriptionId()); id(o.priceId());
        Price p=prices().stream().filter(v->v.id().equals(o.priceId())).findFirst().orElseThrow(()->ApiException.invalid("Price version not found."));
        require(!p.effectiveDate().isAfter(o.effectiveDate()),"Price version does not exist at the event date.");
        List<Event> history=events().stream().filter(e->e.subscriptionId().equals(o.subscriptionId())).toList();
        Event last=history.isEmpty()?null:history.getLast();
        require(last==null||o.effectiveDate().isAfter(last.date()),"Lifecycle events must append strictly after the last effective date; one transition per subscription per day.");
        boolean ended=last!=null&&Set.of("CANCEL","END").contains(last.kind());
        if(o.type().equals("START")) require(last==null,"Subscription already exists.");
        else if(o.type().equals("REACTIVATE")) require(ended,"Only an ended subscription can reactivate.");
        else require(last!=null&&!ended,"An active lifecycle is required.");
        if(Set.of("CANCEL","END").contains(o.type()))require(last.priceId().equals(o.priceId()),"End events must retain the previous price version.");
        else require(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT archived FROM subscription_plans WHERE id=?",Boolean.class,p.planId())),"Cannot start or change to an archived plan.");
    }
    private void validatePayment(Operation o) {
        id(o.subscriptionId()); money(o);
        require(!o.effectiveDate().isAfter(LocalDate.now(ZoneOffset.UTC)),"Paid/refund evidence cannot be future dated.");
        Event state=events().stream().filter(e->e.subscriptionId().equals(o.subscriptionId())&&!e.date().isAfter(o.effectiveDate())).reduce((a,b)->b).orElse(null);
        require(state!=null,"Subscription lifecycle must exist before a payment.");
        if(o.type().equals("PAID")) { require(!Set.of("CANCEL","END").contains(state.kind()),"A paid charge requires an active lifecycle at its effective date.");require(o.chargeId()==null||o.chargeId().isBlank(),"A charge cannot link to another charge."); }
        else {
            id(o.chargeId()); Payment charge=payments().stream().filter(p->p.sourceId().equals(o.chargeId())&&p.kind().equals("PAID")).findFirst().orElseThrow(()->ApiException.invalid("Original paid charge not found."));
            require(charge.subscriptionId().equals(o.subscriptionId())&&!o.effectiveDate().isBefore(charge.date()),"Refund must match the subscription and be on/after its charge.");
            BigDecimal prior=payments().stream().filter(p->o.chargeId().equals(p.chargeId())).map(Payment::amount).reduce(BigDecimal.ZERO,BigDecimal::add);
            require(prior.add(o.amount()).compareTo(charge.amount())<=0,"Refund total cannot exceed the original paid charge.");
        }
    }
    @Transactional public Receipt ingest(Operation o,boolean commit) {
        lock(); boolean replay=validate(o);
        if(replay)return new Receipt("UNCHANGED",o.sourceId(),"Identical source already recorded; no records changed.");
        if(!commit)return new Receipt("VALID",o.sourceId(),"Validated now. Commit revalidates atomically before recording. Imported history remains partial.");
        switch(o.type()) {
            case "PLAN" -> {
                jdbc.update("INSERT INTO subscription_plans(id,name) VALUES(?,?) ON CONFLICT(id) DO NOTHING",o.planId(),o.name().trim());
                jdbc.update("INSERT INTO subscription_prices(id,plan_id,amount,currency,interval,effective_date) VALUES(?,?,?,?,?,?)",o.priceId(),o.planId(),o.amount(),o.currency(),o.interval(),o.effectiveDate());
            }
            case "ARCHIVE" -> jdbc.update("UPDATE subscription_plans SET archived=TRUE WHERE id=?",o.planId());
            case "PAID","REFUND" -> jdbc.update("INSERT INTO subscription_payments(source_id,subscription_id,kind,amount,currency,effective_date,charge_id) VALUES(?,?,?,?,?,?,?)",o.sourceId(),o.subscriptionId(),o.type(),o.amount(),o.currency(),o.effectiveDate(),o.type().equals("REFUND")?o.chargeId():null);
            default -> jdbc.update("INSERT INTO subscription_events(source_id,subscription_id,kind,effective_date,price_id) VALUES(?,?,?,?,?)",o.sourceId(),o.subscriptionId(),o.type(),o.effectiveDate(),o.priceId());
        }
        jdbc.update("INSERT INTO subscription_ingestion(source_id,payload) VALUES(?,?)",o.sourceId(),canonical(o));
        return new Receipt("RECORDED",o.sourceId(),"Recorded once. Previous history retained.");
    }
    List<Price> prices() { return jdbc.query("SELECT * FROM subscription_prices ORDER BY effective_date,id",(r,n)->new Price(r.getString("id"),r.getString("plan_id"),r.getBigDecimal("amount"),r.getString("currency"),r.getString("interval"),r.getDate("effective_date").toLocalDate())); }
    List<Event> events() { return jdbc.query("SELECT * FROM subscription_events ORDER BY effective_date,source_id",(r,n)->new Event(r.getString("source_id"),r.getString("subscription_id"),r.getString("kind"),r.getDate("effective_date").toLocalDate(),r.getString("price_id"))); }
    List<Payment> payments() { return jdbc.query("SELECT * FROM subscription_payments ORDER BY effective_date,source_id",(r,n)->new Payment(r.getString("source_id"),r.getString("subscription_id"),r.getString("kind"),r.getBigDecimal("amount"),r.getString("currency"),r.getDate("effective_date").toLocalDate(),r.getString("charge_id"))); }
    private record Evidence(Map<String,Price> prices,List<Event> events,List<Payment> payments) {}
    private Evidence evidence() { Map<String,Price> p=new HashMap<>(); prices().forEach(v->p.put(v.id(),v));return new Evidence(p,events(),payments()); }
    private Map<String,BigDecimal> paidState(LocalDate date,Evidence e) {
        Map<String,Event> last=new HashMap<>(); e.events().stream().filter(v->!v.date().isAfter(date)).forEach(v->last.put(v.subscriptionId(),v));
        Set<String> paidIds=new HashSet<>(); e.payments().stream().filter(p->p.kind().equals("PAID")&&!p.date().isAfter(date)).forEach(p->paidIds.add(p.subscriptionId()));
        Map<String,BigDecimal> result=new TreeMap<>();
        last.forEach((id,v)->{
            boolean paid=paidIds.contains(id);
            if(paid&&!Set.of("CANCEL","END").contains(v.kind()))result.put(id,e.prices().get(v.priceId()).monthly());
        });return result;
    }
    private static BigDecimal total(Map<String,BigDecimal> s) {return s.values().stream().reduce(BigDecimal.ZERO,BigDecimal::add);}
    private static BigDecimal percent(BigDecimal n,BigDecimal d) {return d.signum()==0?null:n.multiply(BigDecimal.valueOf(100)).divide(d,6,RoundingMode.HALF_UP);}
    public Metrics metrics(LocalDate start,LocalDate end) {
        mode.requireSaas();window(start,end); Evidence e=evidence();
        Map<String,BigDecimal> beginning=paidState(start.minusDays(1),e), previous=beginning;
        Set<String> seen=new HashSet<>();e.payments().stream().filter(p->p.kind().equals("PAID")&&p.date().isBefore(start)).forEach(p->seen.add(p.subscriptionId()));
        BigDecimal added=BigDecimal.ZERO,expansion=BigDecimal.ZERO,contraction=BigDecimal.ZERO,churn=BigDecimal.ZERO,reactivation=BigDecimal.ZERO;
        List<Point> trend=new ArrayList<>();
        for(LocalDate d=start;!d.isAfter(end);d=d.plusDays(1)) {
            Map<String,BigDecimal> next=paidState(d,e);Set<String> ids=new HashSet<>(previous.keySet());ids.addAll(next.keySet());
            for(String id:ids) {
                BigDecimal before=previous.getOrDefault(id,BigDecimal.ZERO),after=next.getOrDefault(id,BigDecimal.ZERO),delta=after.subtract(before);
                if(before.signum()==0&&after.signum()>0) {if(seen.contains(id))reactivation=reactivation.add(after);else added=added.add(after);seen.add(id);}
                else if(after.signum()==0&&before.signum()>0)churn=churn.add(before);
                else if(delta.signum()>0)expansion=expansion.add(delta);else if(delta.signum()<0)contraction=contraction.subtract(delta);
            }
            trend.add(new Point(d,total(next)));previous=next;
        }
        BigDecimal b=total(beginning),ending=total(previous),cash=BigDecimal.ZERO;
        for(Payment p:e.payments())if(!p.date().isBefore(start)&&!p.date().isAfter(end))cash=cash.add(p.kind().equals("PAID")?p.amount():p.amount().negate());
        long ended=beginning.keySet().stream().filter(id->!paidState(end,e).containsKey(id)).count();
        // Revenue churn denominator is beginning cohort only; new/reactivated revenue is excluded.
        BigDecimal cohortLoss=BigDecimal.ZERO,cohortExpansion=BigDecimal.ZERO;
        for(var entry:beginning.entrySet()) {
            BigDecimal delta=previous.getOrDefault(entry.getKey(),BigDecimal.ZERO).subtract(entry.getValue());
            if(delta.signum()<0)cohortLoss=cohortLoss.subtract(delta);else cohortExpansion=cohortExpansion.add(delta);
        }
        Movement m=new Movement(b,added,expansion,contraction,churn,reactivation,ending,ending.subtract(b.add(added).add(expansion).subtract(contraction).subtract(churn).add(reactivation)));
        return new Metrics(start,end,currency(),"PARTIAL_MANUAL_HISTORY",previous.size(),ending,ending.multiply(BigDecimal.valueOf(12)),previous.isEmpty()?null:ending.divide(BigDecimal.valueOf(previous.size()),6,RoundingMode.HALF_UP),cash,beginning.size(),ended,percent(BigDecimal.valueOf(ended),BigDecimal.valueOf(beginning.size())),percent(cohortLoss,b),percent(cohortLoss.subtract(cohortExpansion),b),m,trend);
    }
    static void window(LocalDate start,LocalDate end) {require(start!=null&&end!=null&&!start.isAfter(end)&&!start.isBefore(LocalDate.of(2000,1,1))&&!end.isAfter(LocalDate.now(ZoneOffset.UTC))&&java.time.temporal.ChronoUnit.DAYS.between(start,end)<366,"Choose a past/present UTC date window of at most 366 days, from year 2000.");}
    private static void page(int page,int size,String search) {require(page>=0&&page<=10000&&size>=1&&size<=50&&search!=null&&search.length()<=80,"Use page 0–10000, size 1–50 and search up to 80 characters.");}
    public Page<Plan> plans(String search,int page,int size,String sort,LocalDate asOf) {
        mode.requireSaas();page(page,size,search);window(asOf,asOf);require(Set.of("name","price").contains(sort),"Sort by name or price.");
        Evidence e=evidence();Map<String,BigDecimal> paid=paidState(asOf,e);Map<String,Event> last=new HashMap<>();e.events().stream().filter(v->!v.date().isAfter(asOf)).forEach(v->last.put(v.subscriptionId(),v));
        List<Plan> all=jdbc.query("SELECT * FROM subscription_plans ORDER BY name,id",(r,n)->{
            String id=r.getString("id");var ids=paid.keySet().stream().filter(s->e.prices().get(last.get(s).priceId()).planId().equals(id)).toList();
            return new Plan(id,r.getString("name"),r.getBoolean("archived"),e.prices().values().stream().filter(p->p.planId().equals(id)).sorted(Comparator.comparing(Price::effectiveDate)).toList(),ids.size(),ids.stream().map(paid::get).reduce(BigDecimal.ZERO,BigDecimal::add));
        }).stream().filter(p->(p.name()+" "+p.id()).toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))).sorted(sort.equals("name")?Comparator.comparing(Plan::name).thenComparing(Plan::id):Comparator.comparing((Plan p)->p.prices().stream().filter(v->!v.effectiveDate().isAfter(asOf)).reduce((a,b)->b).map(Price::amount).orElse(BigDecimal.ZERO)).thenComparing(Plan::id)).toList();
        return new Page<>(all.stream().skip((long)page*size).limit(size).toList(),page,size,all.size());
    }
    public Page<Subscriber> subscribers(String search,int page,int size,LocalDate asOf) {
        mode.requireSaas();page(page,size,search);window(asOf,asOf);Evidence e=evidence();Map<String,BigDecimal> paid=paidState(asOf,e);
        Map<String,Event> last=new TreeMap<>();e.events().stream().filter(v->!v.date().isAfter(asOf)).forEach(v->last.put(v.subscriptionId(),v));
        List<Subscriber> all=new ArrayList<>();
        last.forEach((id,v)->{if(id.toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))) {
            Price p=e.prices().get(v.priceId()); LocalDate scheduled=e.events().stream().filter(f->f.subscriptionId().equals(id)&&f.date().isAfter(asOf)&&Set.of("CANCEL","END").contains(f.kind())).map(Event::date).findFirst().orElse(null);
            all.add(new Subscriber(id,p.planId(),p.interval(),Set.of("END","CANCEL").contains(v.kind())?"ENDED":paid.containsKey(id)?"ACTIVE_PAID":"NO_PAID_EVIDENCE",v.date(),scheduled,paid.get(id),p.currency()));
        }});
        return new Page<>(all.stream().skip((long)page*size).limit(size).toList(),page,size,all.size());
    }
    public PlanHistory planHistory(String planId,LocalDate start,LocalDate end) {
        mode.requireSaas();id(planId);window(start,end);
        require(jdbc.queryForObject("SELECT count(*) FROM subscription_plans WHERE id=?",Long.class,planId)==1,"Plan not found.");
        Evidence e=evidence();List<PlanPoint> trend=new ArrayList<>();
        for(LocalDate d=start;!d.isAfter(end);d=d.plusDays(1)) {
            Map<String,Event> last=new HashMap<>();LocalDate day=d;
            e.events().stream().filter(v->!v.date().isAfter(day)).forEach(v->last.put(v.subscriptionId(),v));
            Map<String,BigDecimal> paid=paidState(d,e);List<String> ids=paid.keySet().stream().filter(s->e.prices().get(last.get(s).priceId()).planId().equals(planId)).toList();
            trend.add(new PlanPoint(d,ids.size(),ids.stream().map(paid::get).reduce(BigDecimal.ZERO,BigDecimal::add)));
        }
        return new PlanHistory(planId,start,end,currency(),"PARTIAL_MANUAL_HISTORY",trend);
    }
}
