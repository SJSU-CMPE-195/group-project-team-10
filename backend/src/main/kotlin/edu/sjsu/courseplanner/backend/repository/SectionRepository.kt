package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.model.SectionEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

/*
 Provides database access for saved section rows.
*/
interface SectionRepository : JpaRepository<SectionEntity, Long> {
    fun findByTerm(term: String): List<SectionEntity>

    @Modifying
    @Query("delete from SectionEntity s where s.term = :term")
    fun deleteAllByTerm(@Param("term") term: String)
}