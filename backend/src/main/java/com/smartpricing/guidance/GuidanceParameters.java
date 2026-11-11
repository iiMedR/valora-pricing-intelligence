package com.smartpricing.guidance;

import com.smartpricing.common.ApiException;
import java.util.*;

/** Reject unsupported/ambiguous assumptions instead of silently calculating a different scenario. */
public final class GuidanceParameters {
    public static void verify(Map<String,String[]> query,Class<?> record,Set<String> extra){
        Set<String> accepted=new HashSet<>(extra);
        for(var component:record.getRecordComponents())accepted.add(component.getName());
        for(var entry:query.entrySet())if(!accepted.contains(entry.getKey())||entry.getValue().length!=1)
            throw ApiException.invalid("Use one value for each supported scenario field. Unsupported or repeated parameter: "+entry.getKey());
    }
    private GuidanceParameters() {}
}
