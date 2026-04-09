package edu.sjsu.courseplanner.backend.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

/*
stores instructor information for course offering details and instructor-based filtering.
*/
@Entity
@Table(name = "instructors")
data class InstructorEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val instructorId: Long? = null,

    @Column(nullable = false, length = 100)
    val name: String,

    @Column(nullable = false, length = 100)
    val department: String,

    @Column(columnDefinition = "TEXT")
    val rateMyProfUrl: String? = null,

    val rating: Double? = null
)
