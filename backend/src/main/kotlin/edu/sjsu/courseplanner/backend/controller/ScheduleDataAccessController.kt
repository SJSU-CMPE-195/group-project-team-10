package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.service.ScheduleDataAccessService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/*
a controller that adds read-only API endpoints for retrieving course catalog and
course offering data without replacing the existing section controller.
*/
@RestController
@RequestMapping("/api/schedule-data")
class ScheduleDataAccessController(
    private val scheduleDataAccessService: ScheduleDataAccessService
) {

    // returns all course offerings for all terms or one selected term.
    @GetMapping("/full-schedule")
    fun getFullSchedule(
        @RequestParam(required = false) term: String?
    ) = scheduleDataAccessService.getFullSchedule(term)

    // returns course catalog summaries for a single department, optionally filtered by term.
    @GetMapping("/departments/{department}/courses")
    fun getCoursesByDepartment(
        @PathVariable department: String,
        @RequestParam(required = false) term: String?
    ) = scheduleDataAccessService.getCoursesByDepartment(department, term)
}
