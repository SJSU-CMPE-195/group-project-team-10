package edu.sjsu.courseplanner.backend.model

import jakarta.persistence.*

@Entity
@Table(name = "users")
data class UserEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,

    @Column(nullable = false, unique = true, length = 255)
    var email: String = "",

    @Column(nullable = true, length = 255)
    var passwordHash: String? = null,

    @Column(nullable = false, length = 255)
    var fullName: String = "",

    @Column(nullable = false, length = 50)
    var provider: String = "local",

    @Column(unique = true, length = 255)
    var googleSub: String? = null,

    @Column(unique = true, length = 255)
    var ssoSubject: String? = null
)