package com.smartpricing.shopify;

import java.time.*;
import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ShopifyRepository {
    private final JdbcTemplate jdbc;public ShopifyRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public record Connection(String shop,String status,String scopes,String access,String refresh,Instant accessExpires,Instant refreshExpires,Instant connected,Instant disconnected,String error,long generation,Instant updated){@Override public String toString(){return "ShopifyConnection[REDACTED]";}}
    public record State(String hash,String binding,String shop,long generation,Instant expires,Instant consumed){}
    public Connection connection(boolean lock){return jdbc.queryForObject("SELECT * FROM shopify_connection WHERE id=1"+(lock?" FOR UPDATE":""),(rs,n)->new Connection(rs.getString("shop_domain"),rs.getString("status"),rs.getString("scopes"),rs.getString("encrypted_access_token"),rs.getString("encrypted_refresh_token"),time(rs,"access_expires_at"),time(rs,"refresh_expires_at"),time(rs,"connected_at"),time(rs,"disconnected_at"),rs.getString("last_error"),rs.getLong("generation"),time(rs,"updated_at")));}
    public void pending(String shop,String hash,String binding,Instant now,long generation){
        jdbc.update("DELETE FROM shopify_oauth_states WHERE expires_at<?",Timestamp.from(now.minus(Duration.ofDays(1))));
        invalidate(now);jdbc.update("UPDATE shopify_connection SET shop_domain=?,status='PENDING',scopes=NULL,encrypted_access_token=NULL,encrypted_refresh_token=NULL,access_expires_at=NULL,refresh_expires_at=NULL,connected_at=NULL,disconnected_at=NULL,last_error=NULL,generation=?,updated_at=? WHERE id=1",shop,generation,Timestamp.from(now));
        jdbc.update("INSERT INTO shopify_oauth_states(state_hash,account_id,session_binding_hash,shop_domain,generation,expires_at) VALUES(?,1,?,?,?,?)",hash,binding,shop,generation,Timestamp.from(now.plus(Duration.ofMinutes(10))));
    }
    public Optional<State> state(String hash){return jdbc.query("SELECT * FROM shopify_oauth_states WHERE state_hash=?",(rs,n)->new State(rs.getString("state_hash"),rs.getString("session_binding_hash"),rs.getString("shop_domain"),rs.getLong("generation"),time(rs,"expires_at"),time(rs,"consumed_at")),hash).stream().findFirst();}
    public boolean consume(String hash,Instant now){return jdbc.update("UPDATE shopify_oauth_states SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL AND expires_at>?",Timestamp.from(now),hash,Timestamp.from(now))==1;}
    public void connected(ShopifyProvider.Tokens tokens,String access,String refresh,Instant now){jdbc.update("UPDATE shopify_connection SET status='CONNECTED',scopes=?,encrypted_access_token=?,encrypted_refresh_token=?,access_expires_at=?,refresh_expires_at=?,connected_at=?,disconnected_at=NULL,last_error=NULL,updated_at=? WHERE id=1",String.join(",",tokens.scopes()),access,refresh,Timestamp.from(tokens.accessExpires()),tokens.refreshExpires()==null?null:Timestamp.from(tokens.refreshExpires()),Timestamp.from(now),Timestamp.from(now));}
    public void failed(String code,Instant now){jdbc.update("UPDATE shopify_connection SET status='FAILED',encrypted_access_token=NULL,encrypted_refresh_token=NULL,access_expires_at=NULL,refresh_expires_at=NULL,last_error=?,updated_at=? WHERE id=1",code,Timestamp.from(now));}
    public void disconnect(String error,Instant now){invalidate(now);jdbc.update("UPDATE shopify_connection SET status='DISCONNECTED',encrypted_access_token=NULL,encrypted_refresh_token=NULL,access_expires_at=NULL,refresh_expires_at=NULL,scopes=NULL,last_error=?,disconnected_at=?,generation=generation+1,updated_at=? WHERE id=1",error,Timestamp.from(now),Timestamp.from(now));}
    private void invalidate(Instant now){jdbc.update("UPDATE shopify_oauth_states SET consumed_at=? WHERE consumed_at IS NULL",Timestamp.from(now));}
    private Instant time(ResultSet rs,String name)throws SQLException{var value=rs.getTimestamp(name);return value==null?null:value.toInstant();}
}
