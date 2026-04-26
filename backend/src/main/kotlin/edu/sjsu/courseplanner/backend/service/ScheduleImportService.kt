package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import edu.sjsu.courseplanner.backend.repository.ScheduleImportRepository
import edu.sjsu.courseplanner.backend.repository.ScheduleImportResult
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ScheduleImportService(
    private val scheduleImportRepository: ScheduleImportRepository
) {

    @Transactional
    fun importScrapedTerm(term: String, scrapedRows: List<ScrapedSectionDto>): ScheduleImportResult {
        return scheduleImportRepository.importScrapedTerm(term, scrapedRows)
    }
}
