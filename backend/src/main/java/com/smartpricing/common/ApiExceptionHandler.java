package com.smartpricing.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.dao.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record ErrorResponse(String code, String message, java.time.Instant timestamp,
                                java.util.Map<String, String> fieldErrors) {}

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Object> handleDomain(ApiException exception) {
        return error(exception.status(), exception.code(), exception.getMessage(), java.util.Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Object> handleIntegrity(DataIntegrityViolationException exception) {
        return error(HttpStatus.CONFLICT, "DATA_CONFLICT",
                "A category name or SKU is already used, or this record is referenced by another record.", java.util.Map.of());
    }

    @ExceptionHandler({OptimisticLockingFailureException.class, PessimisticLockingFailureException.class})
    ResponseEntity<Object> handleConcurrentEdit(Exception exception) {
        return error(HttpStatus.CONFLICT, "STALE_VERSION", "This record changed or is busy. Reload and retry.", java.util.Map.of());
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body, HttpHeaders headers,
                                                              HttpStatusCode status, WebRequest request) {
        var fields = new java.util.LinkedHashMap<String, String>();
        if (exception instanceof MethodArgumentNotValidException validation) {
            validation.getBindingResult().getFieldErrors().forEach(field -> fields.putIfAbsent(field.getField(), field.getDefaultMessage()));
        }
        String message = fields.isEmpty() ? "Invalid request. Check the URL, parameters, JSON types, and required fields." : "Please correct the invalid fields.";
        String code = status.value() == 404 ? "NOT_FOUND" : "INVALID_REQUEST";
        return new ResponseEntity<>(new ErrorResponse(code, message, java.time.Instant.now(), fields), headers, status);
    }

    private ResponseEntity<Object> error(HttpStatus status, String code, String message, java.util.Map<String, String> fields) {
        return ResponseEntity.status(status).body(new ErrorResponse(code, message, java.time.Instant.now(), fields));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Object> handleUnexpected(Exception exception) {
        LOG.error("Unexpected request failure", exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected server error occurred.", java.util.Map.of());
    }
}
