package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.model.UserEntity
import org.springframework.data.jpa.repository.JpaRepository

// lets backend query/store users easily
interface UserRepository : JpaRepository<UserEntity, Long> {
    fun findByEmail(email: String): UserEntity?
    fun existsByEmail(email: String): Boolean
}