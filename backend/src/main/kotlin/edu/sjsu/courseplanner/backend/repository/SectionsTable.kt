package edu.sjsu.courseplanner.backend.repository

import org.jetbrains.exposed.v1.core.Table

object SectionsTable : Table("sections") {
    val id = long("id").autoIncrement()
    val term = varchar("term", 255)
    val courseCode = varchar("course_code", 255)
    val sectionCode = varchar("section_code", 255)
    val classNumber = varchar("class_number", 255)
    val modeOfInstruction = varchar("mode_of_instruction", 255)
    val title = varchar("title", 500)
    val satisfies = varchar("satisfies", 255).nullable()
    val units = double("units")
    val type = varchar("TYPE", 255)
    val days = varchar("days", 255)
    val times = varchar("times", 255)
    val instructor = varchar("instructor", 255)
    val location = varchar("location", 255)
    val dates = varchar("dates", 255)
    val openSeats = integer("open_seats")
    val notes = text("notes").nullable()

    override val primaryKey = PrimaryKey(id)
}
