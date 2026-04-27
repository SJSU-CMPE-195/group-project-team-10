package edu.sjsu.courseplanner.backend.model

import jakarta.persistence.*

@Entity
@Table(name = "users")
data class UserEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false, unique = true, length = 255)
    val email: String = "",

    @Column(nullable = false, length = 255)
    val passwordHash: String = "",

    @Column(nullable = false, length = 255)
    val fullName: String = "",

    @Column(nullable = false, length = 50)
    val provider: String = "local",

    @Column(unique = true, length = 255)
    val googleSub: String? = null,

    @Column(unique = true, length = 255)
    val ssoSubject: String? = null
)