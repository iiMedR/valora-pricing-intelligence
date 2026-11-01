package com.smartpricing.business.controller;

import com.smartpricing.business.dto.BusinessDtos.*;
import com.smartpricing.business.service.BusinessService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/business-settings")
public class BusinessController {
    private final BusinessService service;
    public BusinessController(BusinessService service) { this.service = service; }
    @GetMapping public Settings get() { return service.get(); }
    @PutMapping public Settings update(@Valid @RequestBody Update input) { return service.update(input); }
}
