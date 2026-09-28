package edu.sjsu.courseplanner.backend.dto

import java.time.Instant

// shape of announcement returned to frontend (banner and admin page)
data class AnnouncementDto(
    val id: Long,
    val title: String,
    val message: String,
    val severity: String,
    val active: Boolean,
    val createdAt: Instant,
    val expiresAt: Instant?,
    val createdByName: String?
)

// when admin posts to /api/admin/announcements, Spring maps it to CreateAnnouncementRequest
data class CreateAnnouncementRequest(
    val title: String = "",
    val message: String = "",
    val severity: String = "INFO",
    val expiresAt: Instant? = null
)
