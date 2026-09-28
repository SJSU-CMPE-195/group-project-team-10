package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.AnnouncementDto
import java.time.Instant
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.greater
import org.jetbrains.exposed.v1.core.isNull
import org.jetbrains.exposed.v1.core.or
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.Query
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository

@Repository
class AnnouncementRepository(
    private val database: Database
) {
    // active and not yet expired, newest first
    fun findActive(now: Instant): List<AnnouncementDto> = transaction(database) {
        selectWithAuthor()
            .andWhere { AnnouncementsTable.active eq true }
            .andWhere { AnnouncementsTable.expiresAt.isNull() or (AnnouncementsTable.expiresAt greater now) }
            .newestFirst()
            .map(::toAnnouncementDto)
    }

    fun findAll(): List<AnnouncementDto> = transaction(database) {
        selectWithAuthor()
            .newestFirst()
            .map(::toAnnouncementDto)
    }

    fun findById(id: Long): AnnouncementDto? = transaction(database) {
        selectWithAuthor()
            .andWhere { AnnouncementsTable.id eq id }
            .firstOrNull()
            ?.let(::toAnnouncementDto)
    }

    fun insert(
        title: String,
        message: String,
        severity: String,
        createdAt: Instant,
        expiresAt: Instant?,
        createdBy: Long?
    ): Long = transaction(database) {
        AnnouncementsTable.insert { statement ->
            statement[AnnouncementsTable.title] = title
            statement[AnnouncementsTable.message] = message
            statement[AnnouncementsTable.severity] = severity
            statement[AnnouncementsTable.createdAt] = createdAt
            statement[AnnouncementsTable.expiresAt] = expiresAt
            statement[AnnouncementsTable.createdBy] = createdBy
        } get AnnouncementsTable.id
    }

    fun deactivate(id: Long) {
        transaction(database) {
            AnnouncementsTable.update({ AnnouncementsTable.id eq id }) { statement ->
                statement[AnnouncementsTable.active] = false
            }
        }
    }

    // returns false when no announcement has the id
    fun delete(id: Long): Boolean = transaction(database) {
        AnnouncementsTable.deleteWhere { AnnouncementsTable.id eq id } > 0
    }

    private fun selectWithAuthor(): Query =
        AnnouncementsTable.leftJoin(UsersTable).select(AnnouncementsTable.columns + UsersTable.fullName)

    private fun Query.newestFirst(): Query =
        orderBy(AnnouncementsTable.createdAt to SortOrder.DESC, AnnouncementsTable.id to SortOrder.DESC)

    private fun toAnnouncementDto(row: ResultRow): AnnouncementDto = AnnouncementDto(
        id = row[AnnouncementsTable.id],
        title = row[AnnouncementsTable.title],
        message = row[AnnouncementsTable.message],
        severity = row[AnnouncementsTable.severity],
        active = row[AnnouncementsTable.active],
        createdAt = row[AnnouncementsTable.createdAt],
        expiresAt = row[AnnouncementsTable.expiresAt],
        createdByName = row.getOrNull(UsersTable.fullName)
    )
}
