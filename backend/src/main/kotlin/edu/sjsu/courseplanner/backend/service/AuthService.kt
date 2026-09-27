package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.config.AdminProperties
import edu.sjsu.courseplanner.backend.dto.AuthUserResponse
import edu.sjsu.courseplanner.backend.dto.RegisterRequest
import edu.sjsu.courseplanner.backend.dto.UserDto
import edu.sjsu.courseplanner.backend.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val adminProperties: AdminProperties
) {

    fun register(request: RegisterRequest): AuthUserResponse {
        val email = request.email.trim().lowercase()
        val fullName = request.fullName.trim()

        require(email.isNotBlank()) { "Email is required" }
        require(fullName.isNotBlank()) { "Full name is required" }
        require(request.password.length >= 8) { "Password must be at least 8 characters" }

        if (userRepository.existsByEmail(email)) {
            throw IllegalArgumentException("Email already in use")
        }

        val encodedPassword = requireNotNull(passwordEncoder.encode(request.password)) {
            "Password encoder returned null"
        }

        val user = userRepository.save(
            UserDto(
                email = email,
                passwordHash = encodedPassword,
                fullName = fullName,
                provider = "local",
                role = adminProperties.roleFor(email)
            )
        )

        return mapToAuthUserResponse(user)
    }

    fun getByEmail(email: String): UserDto? {
        return userRepository.findByEmail(email.trim().lowercase())
    }

    // keeps the stored role in line with the ADMIN_EMAILS allowlist
    fun syncRole(user: UserDto): UserDto {
        val expectedRole = adminProperties.roleFor(user.email)
        if (user.role == expectedRole) {
            return user
        }
        user.role = expectedRole
        return userRepository.save(user)
    }

    fun mapToAuthUserResponse(user: UserDto): AuthUserResponse {
        return AuthUserResponse(
            id = requireNotNull(user.id),
            email = user.email,
            fullName = user.fullName,
            provider = user.provider,
            role = user.role
        )
    }
}