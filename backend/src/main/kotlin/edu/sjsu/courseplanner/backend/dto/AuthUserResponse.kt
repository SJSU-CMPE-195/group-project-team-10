package edu.sjsu.courseplanner.backend.dto

// shape of user data returned to frontend
data class AuthUserResponse(
    val id: Long,
    val email: String,
    val fullName: String,
    val provider: String
)