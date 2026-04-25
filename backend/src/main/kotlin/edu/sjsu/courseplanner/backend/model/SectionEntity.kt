package edu.sjsu.courseplanner.backend.model

import jakarta.persistence.*

/*
 Stores one scraped course section row in the database.
 This is the first persistence model for schedule data.
*/
@Entity
@Table(name = "sections")
data class SectionEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(nullable = false)
    val term: String,

    @Column(nullable = false)
    val courseCode: String,

    @Column(nullable = false)
    val sectionCode: String,

    @Column(nullable = false)
    val classNumber: String,

    @Column(nullable = false)
    val modeOfInstruction: String,

    @Column(nullable = false, length = 500)
    val title: String,

    val satisfies: String? = null,

    @Column(nullable = false)
    val units: Double,

    @Column(nullable = false)
    val type: String,

    @Column(nullable = false)
    val days: String,

    @Column(nullable = false)
    val times: String,

    @Column(nullable = false)
    val instructor: String,

    @Column(nullable = false)
    val location: String,

    @Column(nullable = false)
    val dates: String,

    @Column(nullable = false)
    val openSeats: Int,

    @Column(columnDefinition = "TEXT")
    val notes: String? = null
)