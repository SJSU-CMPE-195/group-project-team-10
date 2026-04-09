package edu.sjsu.courseplanner.backend.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

/*
stores prerequisite or corequisite links between two courses.
*/
@Entity
@Table(name = "prerequisites")
data class PrerequisiteEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val prerequisiteId: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    val course: CourseEntity,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prereq_course_id", nullable = false)
    val prerequisiteCourse: CourseEntity,

    @Column(nullable = false, length = 20)
    val prereqType: String
)
