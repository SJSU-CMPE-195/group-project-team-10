package edu.sjsu.courseplanner.backend.dto
// Represents one parsed course section row from the Spring 2026 schedule page.
data class ScrapedSectionDto(
    val courseCode: String,
    val sectionCode: String,
    val classNumber: String,
    val modeOfInstruction: String,
    val title: String,
    val satisfies: String?,
    val units: Double,
    val type: String,
    val days: String,
    val times: String,
    val instructor: String,
    val location: String,
    val dates: String,
    val openSeats: Int,
    val notes: List<String> = emptyList()
)