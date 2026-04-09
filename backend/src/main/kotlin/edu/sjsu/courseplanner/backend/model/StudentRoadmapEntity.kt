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
stores courses a student plans to take in future terms.
*/
@Entity
@Table(name = "student_road_map")
data class StudentRoadmapEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val roadmapId: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    val student: StudentEntity,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    val course: CourseEntity,

    @Column(nullable = false, length = 20)
    val plannedTerm: String,

    @Column(nullable = false, length = 20)
    val status: String
)
