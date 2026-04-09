package edu.sjsu.courseplanner.backend.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

/*
stores each academic major so students can be linked to one program of study.
*/
@Entity
@Table(name = "majors")
data class MajorEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val majorId: Long? = null,

    @Column(nullable = false, length = 100)
    val majorName: String,

    @Column(nullable = false, length = 100)
    val department: String,

    @Column(nullable = false)
    val totalUnits: Int
)
