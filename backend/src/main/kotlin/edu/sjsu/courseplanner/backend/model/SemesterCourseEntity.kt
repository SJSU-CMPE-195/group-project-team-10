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
links a planned semester to a specific course.
*/
@Entity
@Table(name = "semester_courses")
data class SemesterCourseEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val semesterCourseId: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    val semester: SemesterEntity,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    val course: CourseEntity
)
