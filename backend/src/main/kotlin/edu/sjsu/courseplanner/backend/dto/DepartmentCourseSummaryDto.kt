package edu.sjsu.courseplanner.backend.dto

/*
summary view of the COURSES catalog plus related COURSE_OFFERING rows for one department and term.
*/
data class DepartmentCourseSummaryDto(
    val term: String,
    val department: String,
    val courseNumber: String,
    val courseCode: String,
    val courseTitle: String,
    val totalSections: Int,
    val openSections: Int
)
