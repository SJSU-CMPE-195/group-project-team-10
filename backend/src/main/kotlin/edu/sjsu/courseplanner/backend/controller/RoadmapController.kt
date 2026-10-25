package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.service.RoadmapService
import edu.sjsu.courseplanner.backend.dto.AccountRoadmapDto
import edu.sjsu.courseplanner.backend.service.UserRoadmapService
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/roadmaps")
class RoadmapController(
    private val roadmapService: RoadmapService,
    private val userRoadmapService: UserRoadmapService
) {
    @GetMapping("/majors")
    fun getMajors() = roadmapService.getMajors()

    @GetMapping("/majors/{majorId}")
    fun getRoadmap(@PathVariable majorId: Int) = roadmapService.getRoadmap(majorId)

    @GetMapping("/me")
    fun getMyRoadmap(authentication: Authentication?) =
        userRoadmapService.getMyRoadmap(authentication)

    @PutMapping("/me")
    fun saveMyRoadmap(
        @RequestBody request: AccountRoadmapDto,
        authentication: Authentication?
    ) = userRoadmapService.saveMyRoadmap(authentication, request)
}
