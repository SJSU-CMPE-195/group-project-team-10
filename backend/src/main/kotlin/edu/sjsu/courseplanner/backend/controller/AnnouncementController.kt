package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.dto.AnnouncementDto
import edu.sjsu.courseplanner.backend.dto.CreateAnnouncementRequest
import edu.sjsu.courseplanner.backend.service.AnnouncementService
import edu.sjsu.courseplanner.backend.service.CurrentUserService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

// public banner feed and admin only management. /api/admin/** is gated in SecurityConfig
@RestController
@RequestMapping("/api")
class AnnouncementController(
    private val announcementService: AnnouncementService,
    private val currentUserService: CurrentUserService
) {

    @GetMapping("/announcements/active")
    fun active(): List<AnnouncementDto> = announcementService.getActive()

    @GetMapping("/admin/announcements")
    fun all(): List<AnnouncementDto> = announcementService.getAll()

    @PostMapping("/admin/announcements")
    fun create(
        @RequestBody request: CreateAnnouncementRequest,
        authentication: Authentication?
    ): ResponseEntity<AnnouncementDto> {
        val admin = currentUserService.requireAdmin(authentication)
        return ResponseEntity.status(HttpStatus.CREATED).body(announcementService.create(request, admin))
    }

    @PostMapping("/admin/announcements/{id}/deactivate")
    fun deactivate(@PathVariable id: Long): AnnouncementDto = announcementService.deactivate(id)

    @DeleteMapping("/admin/announcements/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Void> {
        announcementService.delete(id)
        return ResponseEntity.noContent().build()
    }
}
