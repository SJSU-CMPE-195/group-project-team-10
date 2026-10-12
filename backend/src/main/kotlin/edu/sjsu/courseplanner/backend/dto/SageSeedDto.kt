package edu.sjsu.courseplanner.backend.dto

data class SageSeedFileDto(
    val catalogYear: String,
    val programs: List<SageSeedProgramDto>
)

data class SageSeedProgramDto(
    val undergraduateMajor: String,
    val graduateProgram: String,
    val minimumGpa: Double,
    val minimumUndergradUnits: Int,
    val maximumUndergradUnits: Int,
    val totalProgramUnits: Int,
    val requirements: List<SageSeedRequirementDto>
)

data class SageSeedRequirementDto(
    val name: String,
    val requiredUnits: Int,
    val description: String?,
    val courses: List<SageSeedCourseDto>
)

data class SageSeedCourseDto(
    val courseCode: String,
    val courseTitle: String,
    val role: String,
    val doubleCountEligible: Boolean
)