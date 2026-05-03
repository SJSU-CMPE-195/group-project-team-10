package edu.sjsu.courseplanner.backend.dto

data class UserDto(
    var id: Long? = null,
    var email: String = "",
    var passwordHash: String? = null,
    var fullName: String = "",
    var provider: String = "local",
    var googleSub: String? = null,
    var ssoSubject: String? = null
)
