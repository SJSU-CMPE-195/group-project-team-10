package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.dto.UserDto
import edu.sjsu.courseplanner.backend.repository.AnnouncementsTable
import edu.sjsu.courseplanner.backend.repository.UserRepository
import edu.sjsu.courseplanner.backend.repository.UsersTable
import edu.sjsu.courseplanner.backend.service.CurrentUserService
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.deleteAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.web.server.ResponseStatusException

@SpringBootTest
@AutoConfigureMockMvc
class AdminRoleTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var currentUserService: CurrentUserService

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var database: Database

    @BeforeEach
    fun clearUsers() {
        transaction(database) {
            AnnouncementsTable.deleteAll()
            UsersTable.deleteAll()
        }
    }

    @Test
    fun `register gives allowlisted emails the admin role`() {
        register("Admin@Test.edu")
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.role").value("ADMIN"))

        register("student@test.edu")
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.role").value("USER"))
    }

    @Test
    fun `login promotes a stored user who is now on the allowlist`() {
        saveLocalUser("admin@test.edu", role = "USER")

        login("admin@test.edu")
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.role").value("ADMIN"))

        assertEquals("ADMIN", userRepository.findByEmail("admin@test.edu")?.role)
    }

    @Test
    fun `login demotes a stored admin who is no longer on the allowlist`() {
        saveLocalUser("former-admin@test.edu", role = "ADMIN")

        login("former-admin@test.edu")
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.role").value("USER"))
    }

    @Test
    fun `me reports the stored role`() {
        saveLocalUser("admin@test.edu", role = "ADMIN")

        mockMvc.perform(get("/api/auth/me").with(user("admin@test.edu")))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.role").value("ADMIN"))
    }

    @Test
    fun `requireAdmin rejects anonymous and non-admin users`() {
        saveLocalUser("student@test.edu", role = "USER")
        saveLocalUser("admin@test.edu", role = "ADMIN")

        val anonymous = assertThrows<ResponseStatusException> { currentUserService.requireAdmin(null) }
        assertEquals(HttpStatus.UNAUTHORIZED, anonymous.statusCode)

        val student = assertThrows<ResponseStatusException> {
            currentUserService.requireAdmin(authenticated("student@test.edu"))
        }
        assertEquals(HttpStatus.FORBIDDEN, student.statusCode)

        assertEquals("admin@test.edu", currentUserService.requireAdmin(authenticated("admin@test.edu")).email)
    }

    private fun register(email: String) = mockMvc.perform(
        post("/api/auth/register")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"email":"$email","password":"password123","fullName":"Test User"}""")
    )

    private fun login(email: String) = mockMvc.perform(
        post("/api/auth/login")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"email":"$email","password":"password123"}""")
    )

    private fun saveLocalUser(email: String, role: String) = userRepository.save(
        UserDto(
            email = email,
            passwordHash = passwordEncoder.encode("password123"),
            fullName = "Test User",
            provider = "local",
            role = role
        )
    )

    private fun authenticated(email: String) = UsernamePasswordAuthenticationToken.authenticated(
        email,
        null,
        listOf(SimpleGrantedAuthority("ROLE_USER"))
    )
}
