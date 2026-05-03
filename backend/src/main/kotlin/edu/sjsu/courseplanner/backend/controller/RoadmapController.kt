package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.service.RoadmapService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/roadmaps")
class RoadmapController(
    private val roadmapService: RoadmapService
) {
    @GetMapping("/majors")
    fun getMajors() = roadmapService.getMajors()

    @GetMapping("/majors/{majorId}")
    fun getRoadmap(@PathVariable majorId: Int) = roadmapService.getRoadmap(majorId)
}
