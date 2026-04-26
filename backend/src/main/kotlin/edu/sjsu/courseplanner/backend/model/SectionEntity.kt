package edu.sjsu.courseplanner.backend.model

/*
 Stores one scraped course section row independent of the persistence library.
*/
data class SectionEntity(
    val id: Long? = null,
    val term: String,
    val courseCode: String,
    val sectionCode: String,
    val classNumber: String,
    val modeOfInstruction: String,
    val title: String,
    val satisfies: String? = null,
    val units: Double,
    val type: String,
    val days: String,
    val times: String,
    val instructor: String,
    val location: String,
    val dates: String,
    val openSeats: Int,
    val notes: String? = null
)
