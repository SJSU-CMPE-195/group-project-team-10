package edu.sjsu.courseplanner.backend
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import javax.sql.DataSource

// Returns a simple health-check response to confirm the backend & database is running
@RestController
@RequestMapping("/api")
class HealthController(private val dataSource: DataSource) {
    // test backend
    @GetMapping("/health")
    fun health(): Map<String, String> {
        return mapOf("status" to "ok")
    }
    // test db
    @GetMapping("/db")
    fun dbHealth(): Map<String, String> {
        return try {
            val conn = dataSource.connection
            val status = if (!conn.isClosed) "connected" else "not connected"
            conn.close()
            mapOf("database" to status)
        } catch (e: Exception) {
            mapOf("database" to "error", "message" to (e.message ?: "unknown"))
        }
    }
}