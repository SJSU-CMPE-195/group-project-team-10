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
stores the semester-specific offering of a course, including section, instructor, and schedule details.
*/
@Entity
@Table(name = "course_offerings")
data class CourseOfferingEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val offeringId: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    val course: CourseEntity,

    @Column(nullable = false, length = 20)
    val term: String,

    @Column(nullable = false, length = 10)
    val sectionNumber: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instructor_id")
    val instructor: InstructorEntity? = null,

    @Column(nullable = false, length = 20)
    val mode: String,

    @Column(nullable = false)
    val seatsAvailable: Int,

    @Column(nullable = false, length = 100)
    val scheduleInfo: String
)
