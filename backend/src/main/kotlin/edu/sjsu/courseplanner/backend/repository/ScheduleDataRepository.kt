package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.model.SectionEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

/*
that provides database queries to fetch and delete course schedule data (sections), including filtering
by term and department.
*/
interface ScheduleDataRepository : JpaRepository<SectionEntity, Long> {

    // returns all course sections from the database, optionally filtered by term, and sorted.
    @Query(
        """
        select s
        from SectionEntity s
        where (:term is null or s.term = :term)
        order by s.term, s.courseCode, s.sectionCode, s.classNumber
        """
    )
    fun findFullSchedule(@Param("term") term: String?): List<SectionEntity>

    // returns all course sections for a specific department (and optional term) using a LIKE match on course code.
    @Query(
        """
        select s
        from SectionEntity s
        where upper(s.courseCode) like concat(upper(:department), ' %')
          and (:term is null or s.term = :term)
        order by s.term, s.courseCode, s.sectionCode, s.classNumber
        """
    )
    fun findByDepartment(
        @Param("department") department: String,
        @Param("term") term: String?
    ): List<SectionEntity>

    // deletes all course sections in the database that belong to a specific term
    @Modifying
    @Query("delete from SectionEntity s where s.term = :term")
    fun deleteScheduleForTerm(@Param("term") term: String)
}
