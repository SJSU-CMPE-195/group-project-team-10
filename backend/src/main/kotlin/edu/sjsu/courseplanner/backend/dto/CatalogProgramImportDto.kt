package edu.sjsu.courseplanner.backend.dto

data class CatalogProgramImportResultDto(
    val programKey: String,
    val sourceUrl: String,
    val majorId: Int,
    val majorName: String,
    val totalUnits: Int,
    val coursesUpserted: Int,
    val requirementsCreated: Int,
    val requirementCoursesCreated: Int,
    val prerequisitesCreated: Int
)
