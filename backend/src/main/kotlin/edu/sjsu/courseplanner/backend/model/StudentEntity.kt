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
import java.time.Instant

/*
stores one student record so the planner can personalize majors, roadmaps, and progress.
*/
@Entity
@Table(name = "students")
data class StudentEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val studentId: Long? = null,

    @Column(nullable = false, unique = true, length = 9)
    val sjsuId: String,

    @Column(nullable = false, length = 50)
    val firstName: String,

    @Column(nullable = false, length = 50)
    val lastName: String,

    @Column(nullable = false, unique = true, length = 100)
    val email: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "major_id")
    val major: MajorEntity? = null,

    @Column(length = 20)
    val startTerm: String? = null,

    @Column(length = 20)
    val expectedGrad: String? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
