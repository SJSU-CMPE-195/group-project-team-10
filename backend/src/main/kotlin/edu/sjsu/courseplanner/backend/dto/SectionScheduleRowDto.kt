package edu.sjsu.courseplanner.backend.dto

/*
represents a full course section (including course, schedule, and instructor details) and
is used to transfer structured course offering data from the backend to the frontend.
*/
data class SectionScheduleRowDto(
    val term: String,
    val department: String,
    val courseNumber: String,
    val courseCode: String,
    val courseTitle: String,
    val sectionCode: String,
    val classNumber: String,
    val modeOfInstruction: String,
    val satisfies: String?,
    val units: Double,
    val type: String,
    val days: String,
    val times: String,
    val instructor: String,
    val location: String,
    val dates: String,
    val openSeats: Int,
    val notes: String?
)
