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
stores one requirement category within a major, such as core or elective requirements.
*/
@Entity
@Table(name = "degree_requirements")
data class DegreeRequirementEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val requirementId: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "major_id", nullable = false)
    val major: MajorEntity,

    @Column(nullable = false, length = 100)
    val categoryName: String,

    @Column(nullable = false)
    val requiredUnits: Int
)
