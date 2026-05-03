package edu.sjsu.courseplanner.backend.dto

// when frontend sends JSON to /api/auth/register, Spring maps it to RegisterRequest
data class RegisterRequest(
    val email: String,
    val password: String,
    val fullName: String
)