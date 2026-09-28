package edu.sjsu.courseplanner.backend.config

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.server.ResponseStatusException

// return spring's error to show in the frontend
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException::class)
    fun handleStatus(e: ResponseStatusException): ResponseEntity<Map<String, String>> =
        ResponseEntity.status(e.statusCode).body(mapOf("message" to (e.reason ?: "Request failed")))
}
