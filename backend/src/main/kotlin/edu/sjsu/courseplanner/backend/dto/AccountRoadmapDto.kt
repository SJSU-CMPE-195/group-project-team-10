package edu.sjsu.courseplanner.backend.dto

data class AccountRoadmapDto(
    val majorId: Int,
    val semesters: List<RoadmapSemesterDto>,
    val courses: List<RoadmapCourseDto> = emptyList()
)
