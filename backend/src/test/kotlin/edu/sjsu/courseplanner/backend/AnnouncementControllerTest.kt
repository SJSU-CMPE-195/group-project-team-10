package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.config.AdminProperties
import edu.sjsu.courseplanner.backend.dto.UserDto
import edu.sjsu.courseplanner.backend.repository.AnnouncementRepository
import edu.sjsu.courseplanner.backend.repository.UserRepository
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.sql.DataSource
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
class AnnouncementControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var announcementRepository: AnnouncementRepository

    @Autowired
    private lateinit var dataSource: DataSource

    private var adminId: Long = 0

    @BeforeEach
    fun seedUsers() {
        dataSource.connection.use { connection ->
            connection.createStatement().use { statement ->
                statement.executeUpdate("DELETE FROM announcements")
                statement.executeUpdate("DELETE FROM users")
            }
        }
        adminId = userRepository.save(
            UserDto(email = ADMIN, fullName = "Ada Admin", provider = "google", role = AdminProperties.ROLE_ADMIN)
        ).id!!
        userRepository.save(UserDto(email = STUDENT, fullName = "Sam Student", provider = "google", role = AdminProperties.ROLE_USER))
    }

    @Test
    fun `active endpoint is public and skips inactive and expired announcements`() {
        val now = Instant.now()
        seed("Current", createdAt = now.minus(1, ChronoUnit.HOURS), expiresAt = now.plus(1, ChronoUnit.DAYS))
        seed("Newest", createdAt = now)
        seed("Expired", createdAt = now.minus(2, ChronoUnit.DAYS), expiresAt = now.minus(1, ChronoUnit.HOURS))
        val inactive = seed("Inactive", createdAt = now)
        announcementRepository.deactivate(inactive)

        mockMvc.perform(get("/api/announcements/active"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(2)))
            .andExpect(jsonPath("$[0].title").value("Newest"))
            .andExpect(jsonPath("$[1].title").value("Current"))
            .andExpect(jsonPath("$[1].createdByName").value("Ada Admin"))
    }

    @Test
    fun `admin can create an announcement`() {
        createAs(ADMIN, """{"title":" Maintenance ","message":"Down Friday 6-8 PM","severity":"warning"}""")
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.title").value("Maintenance"))
            .andExpect(jsonPath("$.severity").value("WARNING"))
            .andExpect(jsonPath("$.active").value(true))
            .andExpect(jsonPath("$.createdByName").value("Ada Admin"))
            .andExpect(jsonPath("$.createdAt").isString)

        mockMvc.perform(get("/api/announcements/active"))
            .andExpect(jsonPath("$", hasSize<Any>(1)))
    }

    @Test
    fun `non-admin cannot manage announcements`() {
        createAs(STUDENT, VALID_BODY).andExpect(status().isForbidden)
        mockMvc.perform(get("/api/admin/announcements").with(user(STUDENT)))
            .andExpect(status().isForbidden)
    }

    @Test
    fun `anonymous user cannot create announcements`() {
        createAs(null, VALID_BODY).andExpect(status().isUnauthorized)

        mockMvc.perform(get("/api/announcements/active"))
            .andExpect(jsonPath("$", hasSize<Any>(0)))
    }

    @Test
    fun `create rejects invalid input`() {
        createAs(ADMIN, """{"title":"  ","message":"Body"}""").andExpect(status().isBadRequest)
        createAs(ADMIN, """{"title":"Title","message":"Body","severity":"URGENT"}""").andExpect(status().isBadRequest)
        createAs(ADMIN, """{"title":"Title","message":"Body","expiresAt":"2020-01-01T00:00:00Z"}""")
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `admin can list deactivate and delete announcements`() {
        val id = seed("Take me down", createdAt = Instant.now())

        mockMvc.perform(get("/api/admin/announcements").with(user(ADMIN)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").value(id))

        mockMvc.perform(post("/api/admin/announcements/$id/deactivate").with(user(ADMIN)).with(csrf()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.active").value(false))
        assertEquals(false, announcementRepository.findById(id)?.active)

        mockMvc.perform(delete("/api/admin/announcements/$id").with(user(ADMIN)).with(csrf()))
            .andExpect(status().isNoContent)
        assertNull(announcementRepository.findById(id))

        mockMvc.perform(delete("/api/admin/announcements/$id").with(user(ADMIN)).with(csrf()))
            .andExpect(status().isNotFound)
    }

    private fun createAs(email: String?, body: String) = mockMvc.perform(
        post("/api/admin/announcements")
            .apply { if (email != null) with(user(email)) }
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
    )

    private fun seed(title: String, createdAt: Instant, expiresAt: Instant? = null): Long =
        announcementRepository.insert(
            title = title,
            message = "$title message",
            severity = "INFO",
            createdAt = createdAt,
            expiresAt = expiresAt,
            createdBy = adminId
        )

    companion object {
        private const val ADMIN = "admin@test.edu"
        private const val STUDENT = "student@test.edu"
        private const val VALID_BODY = """{"title":"Hello","message":"World","severity":"INFO"}"""
    }
}
