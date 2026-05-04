package edu.sjsu.courseplanner.backend.dto

data class MajorDto(
    val majorId: Int,
    val majorName: String,
    val department: String,
    val totalRequiredUnits: Int
)

data class RoadmapCourseDto(
    val courseId: Int,
    val courseCode: String,
    val courseTitle: String,
    val description: String?,
    val units: Int,
    val department: String,
    val requirementIds: List<Int>,
    val requirementNames: List<String>
)

data class RoadmapPrerequisiteDto(
    val courseId: Int,
    val prereqCourseId: Int,
    val prereqType: String
)

data class RoadmapRequirementDto(
    val requirementId: Int,
    val majorId: Int,
    val categoryName: String,
    val requiredUnits: Int,
    val courseIds: List<Int>
)

data class RoadmapSemesterCourseDto(
    val courseId: Int,
    val status: String = "planned",
    val note: String = ""
)

data class RoadmapSemesterDto(
    val semesterId: Int,
    val term: String,
    val courses: List<RoadmapSemesterCourseDto>
)

data class MajorRoadmapDto(
    val major: MajorDto,
    val courses: List<RoadmapCourseDto>,
    val prerequisites: List<RoadmapPrerequisiteDto>,
    val degreeRequirements: List<RoadmapRequirementDto>,
    val semesters: List<RoadmapSemesterDto>
)
