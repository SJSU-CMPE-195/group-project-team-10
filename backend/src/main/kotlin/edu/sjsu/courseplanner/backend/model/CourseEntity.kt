package edu.sjsu.courseplanner.backend.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

/*
stores the course catalog so degree requirements and planning can reference canonical courses.
*/
@Entity
@Table(name = "courses")
data class CourseEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val courseId: Long? = null,

    @Column(nullable = false, unique = true, length = 20)
    val courseCode: String,

    @Column(nullable = false, length = 200)
    val courseTitle: String,

    @Column(columnDefinition = "TEXT")
    val description: String? = null,

    @Column(nullable = false)
    val units: Int,

    @Column(nullable = false, length = 50)
    val department: String,

    val difficultyScore: Double? = null,

    val avgWorkload: Double? = null,

    @Column(columnDefinition = "TEXT")
    val syllabusUrl: String? = null
)
