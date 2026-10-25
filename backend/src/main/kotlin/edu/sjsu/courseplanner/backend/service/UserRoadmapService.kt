package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.AccountRoadmapDto
import edu.sjsu.courseplanner.backend.repository.CoursesTable
import edu.sjsu.courseplanner.backend.repository.MajorsTable
import edu.sjsu.courseplanner.backend.repository.RoadmapRepository
import edu.sjsu.courseplanner.backend.repository.UserRoadmapRepository
import edu.sjsu.courseplanner.backend.dto.RoadmapCourseDto
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class UserRoadmapService(
    private val database: Database,
    private val roadmapRepository: RoadmapRepository,
    private val userRoadmapRepository: UserRoadmapRepository,
    private val currentUserService: CurrentUserService
) {
    @Transactional(readOnly = true)
    fun getMyRoadmap(authentication: org.springframework.security.core.Authentication?): AccountRoadmapDto {
        val user = currentUserService.requireUser(authentication)
        val savedRoadmap = userRoadmapRepository.findByUserId(requireNotNull(user.id))
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "No saved roadmap exists for this account")
        val major = roadmapRepository.findMajor(savedRoadmap.majorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Saved roadmap major was not found")
        val requirements = roadmapRepository.findRequirements(major.majorId)
        if (requirements.isEmpty()) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Saved roadmap catalog requirements are no longer available")
        }
        val courseIds = savedRoadmap.semesters.flatMap { semester -> semester.courses.map { it.courseId } }.distinct()
        val coursesById = roadmapRepository.findCourses(courseIds).associateBy { it.courseId }
        val requirementCoursesByCourseId = roadmapRepository.findRequirementCourses(requirements.map { it.requirementId })
            .groupBy { it.courseId }
        val requirementsById = requirements.associateBy { it.requirementId }
        val courses = courseIds.mapNotNull { courseId ->
            coursesById[courseId]?.let { course ->
                val courseRequirements = requirementCoursesByCourseId[courseId].orEmpty()
                    .mapNotNull { requirementsById[it.requirementId] }
                RoadmapCourseDto(
                    courseId = course.courseId,
                    courseCode = course.courseCode,
                    courseTitle = course.courseTitle,
                    description = course.description,
                    units = course.units,
                    department = course.department,
                    requirementIds = courseRequirements.map { it.requirementId },
                    requirementNames = courseRequirements.map { it.categoryName }
                )
            }
        }
        val missingCourseIds = courseIds - courses.map { it.courseId }.toSet()
        if (missingCourseIds.isNotEmpty()) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Saved roadmap references courses that are no longer available: ${missingCourseIds.sorted().joinToString()}"
            )
        }
        return savedRoadmap.copy(courses = courses)
    }

    @Transactional
    fun saveMyRoadmap(
        authentication: org.springframework.security.core.Authentication?,
        request: AccountRoadmapDto
    ): AccountRoadmapDto {
        val user = currentUserService.requireUser(authentication)
        validate(request)
        return userRoadmapRepository.save(requireNotNull(user.id), request.copy(courses = emptyList()))
    }

    private fun validate(roadmap: AccountRoadmapDto) {
        val major = roadmapRepository.findMajor(roadmap.majorId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Major ${roadmap.majorId} was not found")
        if (roadmapRepository.findRequirements(major.majorId).isEmpty()) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "Catalog requirements are not available for ${major.majorName}; import the catalog before saving a roadmap"
            )
        }
        if (roadmap.semesters.isEmpty() || roadmap.semesters.size > MAX_SEMESTERS) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A roadmap must contain between 1 and $MAX_SEMESTERS semesters"
            )
        }
        val semesterIds = mutableSetOf<Int>()
        val courseIds = mutableSetOf<Int>()
        val requestedCourseIds = mutableSetOf<Int>()
        roadmap.semesters.forEach { semester ->
            if (semester.semesterId <= 0 || !semesterIds.add(semester.semesterId)) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Semester IDs must be unique positive integers")
            }
            if (semester.term.isBlank() || semester.term.length > 20) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Each semester must have a term of 1-20 characters")
            }
            if (semester.courses.size > MAX_COURSES_PER_SEMESTER) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "A semester contains too many courses")
            }
            semester.courses.forEach { course ->
                if (course.courseId <= 0 || !courseIds.add(course.courseId)) {
                    throw ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Course IDs must be positive and may appear in only one semester"
                    )
                }
                if (course.status !in VALID_STATUSES) {
                    throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid course status '${course.status}'")
                }
                if (course.note.length > MAX_NOTE_LENGTH) {
                    throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Course notes may not exceed $MAX_NOTE_LENGTH characters")
                }
                requestedCourseIds += course.courseId
            }
        }
        if (requestedCourseIds.isNotEmpty()) {
            val knownCourseIds = transaction(database) {
                CoursesTable.selectAll()
                    .where { CoursesTable.id inList requestedCourseIds }
                    .map { it[CoursesTable.id] }
                    .toSet()
            }
            val unknownCourseIds = requestedCourseIds - knownCourseIds
            if (unknownCourseIds.isNotEmpty()) {
                throw ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Roadmap contains unknown course IDs: ${unknownCourseIds.sorted().joinToString()}"
                )
            }
        }
    }

    companion object {
        private const val MAX_SEMESTERS = 40
        private const val MAX_COURSES_PER_SEMESTER = 30
        private const val MAX_NOTE_LENGTH = 1000
        private val VALID_STATUSES = setOf("planned", "in_progress", "completed", "failed", "blocked")
    }
}
