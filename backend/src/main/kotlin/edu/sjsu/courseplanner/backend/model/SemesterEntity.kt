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
stores a planned or active semester for a student so roadmap courses can be grouped by term.
*/
@Entity
@Table(name = "semesters")
data class SemesterEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val semesterId: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    val student: StudentEntity,

    @Column(nullable = false, length = 20)
    val term: String,

    @Column(nullable = false)
    val totalUnits: Int,

    @Column(nullable = false, length = 20)
    val status: String
)
