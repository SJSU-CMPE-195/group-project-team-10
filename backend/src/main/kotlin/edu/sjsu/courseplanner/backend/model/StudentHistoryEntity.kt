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
stores completed or attempted courses so prerequisite checks and degree progress can be computed.
*/
@Entity
@Table(name = "student_history")
data class StudentHistoryEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val historyId: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    val student: StudentEntity,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    val course: CourseEntity,

    @Column(nullable = false, length = 20)
    val termTaken: String,

    @Column(length = 2)
    val grade: String? = null,

    @Column(nullable = false, length = 20)
    val status: String
)
