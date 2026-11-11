package com.smartpricing.guidance;

import com.smartpricing.catalog.service.CatalogService;
import com.smartpricing.business.service.BusinessService;
import com.smartpricing.subscription.*;
import com.smartpricing.common.ApiException;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import static com.smartpricing.guidance.GuidanceCalculator.*;

@RestController
@RequestMapping("/api/v1")
@Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
public class GuidanceController {
    private final CatalogService catalog;private final BusinessService business;private final BusinessMode mode;
    public GuidanceController(CatalogService catalog,BusinessService business,BusinessMode mode){this.catalog=catalog;this.business=business;this.mode=mode;}
    @GetMapping("/guidance/products/{productId}/variants/{variantId}")
    public Result commerce(@PathVariable UUID productId,@PathVariable UUID variantId,@ModelAttribute CommerceInput inputs,jakarta.servlet.http.HttpServletRequest request){
        if(!mode.mode().equals("ECOMMERCE"))throw ApiException.conflict("BUSINESS_MODE_MISMATCH","Use subscription plan guidance in this installation.");
        GuidanceParameters.verify(request.getParameterMap(),CommerceInput.class,java.util.Set.of());
        var variant=catalog.detail(productId).variants().stream().filter(v->v.id().equals(variantId)).findFirst().orElseThrow(()->ApiException.missing("Variant in this product"));
        return GuidanceCalculator.commerce(variantId.toString(),business.get().currencyCode(),new BigDecimal(variant.currentPrice()),variant.costPrice()==null?null:new BigDecimal(variant.costPrice()),inputs);
    }
}
