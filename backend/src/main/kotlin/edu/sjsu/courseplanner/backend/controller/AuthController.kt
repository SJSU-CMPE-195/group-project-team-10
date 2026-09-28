package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.dto.AuthUserResponse
import edu.sjsu.courseplanner.backend.dto.LoginRequest
import edu.sjsu.courseplanner.backend.dto.RegisterRequest
import edu.sjsu.courseplanner.backend.service.AuthService
import edu.sjsu.courseplanner.backend.service.CurrentUserService
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.ValidationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.web.bind.annotation.*
import org.springframework.security.web.csrf.CsrfToken

// expose auth endpoints
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val authenticationManager: AuthenticationManager,
    private val currentUserService: CurrentUserService
) {

    @PostMapping("/register")
    fun register(
        @RequestBody request: RegisterRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<AuthUserResponse> {
        val user = try {
            authService.register(request)
        } catch (e: IllegalArgumentException) {
            throw ValidationException(e.message)
        }

        val authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(request.email.trim().lowercase(), request.password)
        )

        SecurityContextHolder.getContext().authentication = authentication
        httpRequest.session.setAttribute(
            HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
            SecurityContextHolder.getContext()
        )

        return ResponseEntity.status(HttpStatus.CREATED).body(user)
    }

    @PostMapping("/login")
    fun login(
        @RequestBody request: LoginRequest,
        httpRequest: HttpServletRequest
    ): AuthUserResponse {
        val authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(request.email.trim().lowercase(), request.password)
        )

        SecurityContextHolder.getContext().authentication = authentication
        httpRequest.session.setAttribute(
            HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
            SecurityContextHolder.getContext()
        )

        val user = currentUserService.currentUser(authentication)
            ?: throw IllegalStateException("Authenticated user not found")
        return authService.mapToAuthUserResponse(authService.syncRole(user))
    }

    @GetMapping("/me")
    fun me(authentication: Authentication?): ResponseEntity<AuthUserResponse> {
        val user = currentUserService.currentUser(authentication)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        return ResponseEntity.ok(authService.mapToAuthUserResponse(user))
    }

    @PostMapping("/logout")
    fun logout(request: HttpServletRequest): ResponseEntity<Map<String, String>> {
        request.session.invalidate()
        SecurityContextHolder.clearContext()
        return ResponseEntity.ok(mapOf("message" to "Logged out"))
    }

    @GetMapping("/csrf")
    fun csrf(csrfToken: CsrfToken): Map<String, String> {
        return mapOf("token" to csrfToken.token)
    }
}