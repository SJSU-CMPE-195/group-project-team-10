package edu.sjsu.courseplanner.backend.dto

data class PrerequisiteCsvImportDto(
    val importedFiles: List<String>,
    val rowsRead: Int,
    val courseRecordsMatched: Int,
    val prerequisiteRelationshipsImported: Int,
    val corequisiteRelationshipsImported: Int,
    val courseRecordsCreated: Int,
    val unresolvedCourseCodes: List<String>,
    val invalidRows: List<String>,
    val warnings: List<String>
)
