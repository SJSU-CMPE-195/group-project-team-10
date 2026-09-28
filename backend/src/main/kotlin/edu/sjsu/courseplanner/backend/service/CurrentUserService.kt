package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.config.AdminProperties
import edu.sjsu.courseplanner.backend.dto.UserDto
import edu.sjsu.courseplanner.backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

// resolves sign in user for local and Google sessions
@Service
class CurrentUserService(
    private val userRepository: UserRepository
) {

    fun currentUser(authentication: Authentication?): UserDto? {
        if (authentication == null || !authentication.isAuthenticated || authentication.name == "anonymousUser") {
            return null
        }

        val email = when (val principal = authentication.principal) {
            is OAuth2User -> principal.getAttribute<String>("email")
            else -> authentication.name
        }?.trim()?.lowercase() ?: return null

        return userRepository.findByEmail(email)
    }

    fun requireAdmin(authentication: Authentication?): UserDto {
        val user = currentUser(authentication)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required")

        if (user.role != AdminProperties.ROLE_ADMIN) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required")
        }
        return user
    }
}
