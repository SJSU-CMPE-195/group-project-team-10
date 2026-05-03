package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.MajorDto
import edu.sjsu.courseplanner.backend.dto.MajorRoadmapDto
import edu.sjsu.courseplanner.backend.dto.RoadmapCourseDto
import edu.sjsu.courseplanner.backend.dto.RoadmapPrerequisiteDto
import edu.sjsu.courseplanner.backend.dto.RoadmapRequirementDto
import edu.sjsu.courseplanner.backend.dto.RoadmapSemesterCourseDto
import edu.sjsu.courseplanner.backend.dto.RoadmapSemesterDto
import edu.sjsu.courseplanner.backend.repository.CatalogCourseRecord
import edu.sjsu.courseplanner.backend.repository.MajorRecord
import edu.sjsu.courseplanner.backend.repository.RequirementRecord
import edu.sjsu.courseplanner.backend.repository.RequirementCourseRecord
import edu.sjsu.courseplanner.backend.repository.RoadmapPrerequisiteRecord
import edu.sjsu.courseplanner.backend.repository.RoadmapRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class RoadmapService(
    private val roadmapRepository: RoadmapRepository
) {
    private val supportedMajorNames = listOf(
        "software engineering",
        "data science",
        "computer engineering",
        "computer science",
        "cs"
    )

    @Transactional(readOnly = true)
    fun getMajors(): List<MajorDto> {
        val majors = roadmapRepository.findMajors()
        val supported = majors.filter { major ->
            val normalized = major.majorName.lowercase()
            supportedMajorNames.any { normalized.contains(it) }
        }

        return supported.map(::toMajorDto)
    }

    @Transactional(readOnly = true)
    fun getRoadmap(majorId: Int): MajorRoadmapDto {
        val major = roadmapRepository.findMajor(majorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Major $majorId was not found")

        val requirements = roadmapRepository.findRequirements(majorId)
        val requirementCourses = roadmapRepository.findRequirementCourses(requirements.map { it.requirementId })
        val courseIds = requirementCourses.map { it.courseId }.distinct()
        val courses = roadmapRepository.findCourses(courseIds)
        val prerequisites = roadmapRepository.findPrerequisites(courseIds)
        val roadmapRequirementCourses = selectRoadmapCourses(requirements, requirementCourses, courses)

        val requirementsById = requirements.associateBy { it.requirementId }
        val requirementIdsByCourseId = requirementCourses
            .groupBy { it.courseId }
            .mapValues { (_, entries) -> entries.map { it.requirementId }.distinct() }
        val requirementNamesByCourseId = requirementIdsByCourseId
            .mapValues { (_, requirementIds) ->
                requirementIds.mapNotNull { requirementsById[it]?.categoryName }
            }

        return MajorRoadmapDto(
            major = toMajorDto(major),
            courses = courses.map { course ->
                RoadmapCourseDto(
                    courseId = course.courseId,
                    courseCode = course.courseCode,
                    courseTitle = course.courseTitle,
                    description = course.description,
                    units = course.units,
                    department = course.department,
                    requirementIds = requirementIdsByCourseId[course.courseId] ?: emptyList(),
                    requirementNames = requirementNamesByCourseId[course.courseId] ?: emptyList()
                )
            },
            prerequisites = prerequisites.map {
                RoadmapPrerequisiteDto(
                    courseId = it.courseId,
                    prereqCourseId = it.prereqCourseId,
                    prereqType = it.prereqType
                )
            },
            degreeRequirements = requirements.map { requirement ->
                RoadmapRequirementDto(
                    requirementId = requirement.requirementId,
                    majorId = requirement.majorId,
                    categoryName = requirement.categoryName,
                    requiredUnits = requirement.requiredUnits,
                    courseIds = requirementCourses
                        .filter { it.requirementId == requirement.requirementId }
                        .map { it.courseId }
                )
            },
            semesters = buildSemesters(courses, prerequisites, roadmapRequirementCourses)
        )
    }

    private fun selectRoadmapCourses(
        requirements: List<RequirementRecord>,
        requirementCourses: List<RequirementCourseRecord>,
        courses: List<CatalogCourseRecord>
    ): List<RequirementCourseRecord> {
        val courseById = courses.associateBy { it.courseId }
        return requirements.flatMap { requirement ->
            val candidates = requirementCourses.filter { it.requirementId == requirement.requirementId }
            val candidateUnits = candidates.sumOf { courseById[it.courseId]?.units ?: 0 }

            if (candidateUnits <= requirement.requiredUnits) {
                candidates
            } else {
                val selected = mutableListOf<RequirementCourseRecord>()
                var units = 0

                for (candidate in candidates) {
                    if (units >= requirement.requiredUnits) break
                    selected += candidate
                    units += courseById[candidate.courseId]?.units ?: 0
                }

                selected
            }
        }
    }

    private fun buildSemesters(
        courses: List<CatalogCourseRecord>,
        prerequisites: List<RoadmapPrerequisiteRecord>,
        requirementCourses: List<RequirementCourseRecord>
    ): List<RoadmapSemesterDto> {
        val courseById = courses.associateBy { it.courseId }
        val orderedCourseIds = requirementCourses.map { it.courseId }.distinct().filter { courseById.containsKey(it) }
        val remaining = orderedCourseIds.toMutableSet()
        val completed = mutableSetOf<Int>()
        val semesters = mutableListOf<RoadmapSemesterDto>()
        var semesterIndex = 0

        while (remaining.isNotEmpty()) {
            val available = remaining
                .filter { courseId ->
                    prerequisites
                        .filter { it.courseId == courseId && it.prereqType == "prereq" }
                        .all { completed.contains(it.prereqCourseId) }
                }
                .sortedWith(compareBy<Int> { orderedCourseIds.indexOf(it).takeIf { index -> index >= 0 } ?: Int.MAX_VALUE }
                    .thenBy { courseById[it]?.courseCode ?: "" })

            val selected = takeSemesterCourses(available.ifEmpty { remaining.toList() }, courseById)
            semesterIndex += 1
            semesters += RoadmapSemesterDto(
                semesterId = semesterIndex,
                term = termForIndex(semesterIndex),
                courses = selected.map { RoadmapSemesterCourseDto(courseId = it) }
            )
            remaining.removeAll(selected.toSet())
            completed.addAll(selected)
        }

        return semesters
    }

    private fun takeSemesterCourses(
        courseIds: List<Int>,
        courseById: Map<Int, CatalogCourseRecord>,
        maxUnits: Int = 15
    ): List<Int> {
        val selected = mutableListOf<Int>()
        var units = 0

        for (courseId in courseIds) {
            val courseUnits = courseById[courseId]?.units ?: 0
            if (selected.isNotEmpty() && units + courseUnits > maxUnits) continue
            selected += courseId
            units += courseUnits
        }

        return selected.ifEmpty { listOf(courseIds.first()) }
    }

    private fun termForIndex(index: Int): String {
        val startYear = 2026
        val offset = index - 1
        val season = if (offset % 2 == 0) "Fall" else "Spring"
        val year = startYear + ((offset + 1) / 2)
        return "$season $year"
    }

    private fun toMajorDto(record: MajorRecord): MajorDto {
        return MajorDto(
            majorId = record.majorId,
            majorName = record.majorName,
            department = record.department,
            totalRequiredUnits = record.totalUnits
        )
    }
}
