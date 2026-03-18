package edu.sjsu.courseplanner.backend
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

// Returns a simple health-check response to confirm the backend is running
@RestController
@RequestMapping("/api")
class HealthController {
    @GetMapping("/health")
    fun health(): Map<String, String> {
        return mapOf("status" to "ok")
    }
}