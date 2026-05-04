package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.UserDto
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository

@Repository
class UserRepository(
    private val database: Database
) {
    fun findByEmail(email: String): UserDto? = transaction(database) {
        UsersTable
            .selectAll()
            .andWhere { UsersTable.email eq email }
            .firstOrNull()
            ?.let(::toUserDto)
    }

    fun findByGoogleSub(googleSub: String): UserDto? = transaction(database) {
        UsersTable
            .selectAll()
            .andWhere { UsersTable.googleSub eq googleSub }
            .firstOrNull()
            ?.let(::toUserDto)
    }

    fun existsByEmail(email: String): Boolean = transaction(database) {
        UsersTable
            .selectAll()
            .andWhere { UsersTable.email eq email }
            .limit(1)
            .any()
    }

    fun save(user: UserDto): UserDto = transaction(database) {
        val existingId = user.id
        if (existingId == null) {
            val generatedId = UsersTable.insert { statement ->
                statement[email] = user.email
                statement[passwordHash] = user.passwordHash
                statement[fullName] = user.fullName
                statement[provider] = user.provider
                statement[googleSub] = user.googleSub
                statement[ssoSubject] = user.ssoSubject
            } get UsersTable.id
            user.id = generatedId
        } else {
            UsersTable.update({ UsersTable.id eq existingId }) { statement ->
                statement[email] = user.email
                statement[passwordHash] = user.passwordHash
                statement[fullName] = user.fullName
                statement[provider] = user.provider
                statement[googleSub] = user.googleSub
                statement[ssoSubject] = user.ssoSubject
            }
        }
        user
    }

    private fun toUserDto(row: ResultRow): UserDto = UserDto(
        id = row[UsersTable.id],
        email = row[UsersTable.email],
        passwordHash = row[UsersTable.passwordHash],
        fullName = row[UsersTable.fullName],
        provider = row[UsersTable.provider],
        googleSub = row[UsersTable.googleSub],
        ssoSubject = row[UsersTable.ssoSubject]
    )
}
