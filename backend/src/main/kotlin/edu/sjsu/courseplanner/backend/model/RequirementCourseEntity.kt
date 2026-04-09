package edu.sjsu.courseplanner.backend.model

import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

/*
links a degree requirement category to a course that can satisfy it.
*/
@Entity
@Table(name = "requirement_courses")
data class RequirementCourseEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val requirementCourseId: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requirement_id", nullable = false)
    val requirement: DegreeRequirementEntity,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    val course: CourseEntity
)
