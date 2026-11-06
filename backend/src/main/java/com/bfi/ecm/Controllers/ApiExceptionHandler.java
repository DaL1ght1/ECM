package com.bfi.ecm.Controllers;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ProblemDetail concurrentModification(ObjectOptimisticLockingFailureException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "The resource was modified concurrently; reload and try again");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail dataConflict(DataIntegrityViolationException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "The change conflicts with existing data");
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail invalidParameter(ConstraintViolationException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }
}
