package edu.sjsu.courseplanner.backend.dto

data class CatalogCourseDto(
    val courseId: Int,
    val courseCode: String,
    val courseTitle: String,
    val description: String?,
    val units: Int,
    val department: String,
    val offeringCount: Int,
    val availableTerms: List<String>
)
