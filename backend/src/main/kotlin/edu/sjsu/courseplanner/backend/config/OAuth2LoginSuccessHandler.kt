package edu.sjsu.courseplanner.backend.config

import edu.sjsu.courseplanner.backend.model.UserEntity
import edu.sjsu.courseplanner.backend.repository.UserRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component

@Component
class OAuth2LoginSuccessHandler(
    private val userRepository: UserRepository
) : AuthenticationSuccessHandler {

    override fun onAuthenticationSuccess(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authentication: Authentication
    ) {
        val oauthUser = authentication.principal as OAuth2User

        val googleSub = oauthUser.getAttribute<String>("sub")
            ?: throw IllegalStateException("Google OAuth response missing sub")

        val email = oauthUser.getAttribute<String>("email")
            ?.trim()
            ?.lowercase()
            ?: throw IllegalStateException("Google OAuth response missing email")

        val fullName = oauthUser.getAttribute<String>("name") ?: email

        val user = userRepository.findByGoogleSub(googleSub)
            ?: userRepository.findByEmail(email)
            ?: UserEntity(
                email = email,
                fullName = fullName,
                passwordHash = null,
                provider = "google",
                googleSub = googleSub
            )

        user.email = email
        user.fullName = fullName
        user.provider = "google"
        user.googleSub = googleSub

        userRepository.save(user)

        response.sendRedirect("http://localhost:3030/?login=google-success")
    }
}