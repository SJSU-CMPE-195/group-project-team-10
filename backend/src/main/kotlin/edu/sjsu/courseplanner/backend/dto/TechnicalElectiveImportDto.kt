package edu.sjsu.courseplanner.backend.dto

data class TechnicalElectiveImportDto(
    val programKey: String,
    val majorId: Int,
    val majorName: String,
    val requirementId: Int,
    val coursesImported: Int,
    val coursesCreated: Int,
    val requirementCoursesCreated: Int
)
