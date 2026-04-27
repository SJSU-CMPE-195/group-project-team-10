package edu.sjsu.courseplanner.backend.dto

// when frontend sends JSON to /api/auth/login, Spring maps it to LoginRequest
data class LoginRequest(
    val email: String,
    val password: String
)