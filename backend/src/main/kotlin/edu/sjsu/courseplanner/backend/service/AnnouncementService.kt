package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.AnnouncementDto
import edu.sjsu.courseplanner.backend.dto.CreateAnnouncementRequest
import edu.sjsu.courseplanner.backend.dto.UserDto
import edu.sjsu.courseplanner.backend.repository.AnnouncementRepository
import edu.sjsu.courseplanner.backend.repository.AnnouncementsTable.MAX_MESSAGE_LENGTH
import edu.sjsu.courseplanner.backend.repository.AnnouncementsTable.MAX_TITLE_LENGTH
import java.time.Instant
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class AnnouncementService(
    private val announcementRepository: AnnouncementRepository
) {

    fun getActive(): List<AnnouncementDto> = announcementRepository.findActive(Instant.now())

    fun getAll(): List<AnnouncementDto> = announcementRepository.findAll()

    fun create(request: CreateAnnouncementRequest, author: UserDto): AnnouncementDto {
        val now = Instant.now()
        val title = request.title.trim()
        val message = request.message.trim()
        val severity = request.severity.trim().uppercase()

        if (title.isEmpty()) badRequest("Title is required")
        if (title.length > MAX_TITLE_LENGTH) badRequest("Title must be at most $MAX_TITLE_LENGTH characters")
        if (message.isEmpty()) badRequest("Message is required")
        if (message.length > MAX_MESSAGE_LENGTH) badRequest("Message must be at most $MAX_MESSAGE_LENGTH characters")
        if (severity !in SEVERITIES) badRequest("Severity must be one of ${SEVERITIES.joinToString()}")
        if (request.expiresAt != null && !request.expiresAt.isAfter(now)) badRequest("Expiry must be in the future")

        val id = announcementRepository.insert(
            title = title,
            message = message,
            severity = severity,
            createdAt = now,
            expiresAt = request.expiresAt,
            createdBy = author.id
        )
        return AnnouncementDto(
            id = id,
            title = title,
            message = message,
            severity = severity,
            active = true,
            createdAt = now,
            expiresAt = request.expiresAt,
            createdByName = author.fullName
        )
    }

    fun deactivate(id: Long): AnnouncementDto {
        announcementRepository.deactivate(id)
        return announcementRepository.findById(id) ?: notFound(id)
    }

    fun delete(id: Long) {
        if (!announcementRepository.delete(id)) notFound(id)
    }

    private fun badRequest(message: String): Nothing =
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, message)

    private fun notFound(id: Long): Nothing =
        throw ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement $id was not found")

    companion object {
        val SEVERITIES = listOf("INFO", "WARNING", "CRITICAL")
    }
}
