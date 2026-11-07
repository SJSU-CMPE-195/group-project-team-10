package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.TechnicalElectiveImportDto
import edu.sjsu.courseplanner.backend.repository.TechnicalElectiveImportRepository
import java.util.Locale
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TechnicalElectiveImportService(
    private val technicalElectiveCsvService: TechnicalElectiveCsvService,
    private val technicalElectiveImportRepository: TechnicalElectiveImportRepository
) {
    @Transactional
    fun import(program: String): TechnicalElectiveImportDto {
        val programKey = program.trim().lowercase(Locale.ROOT)
        val courses = technicalElectiveCsvService.load(programKey)
        return technicalElectiveImportRepository.import(programKey, courses)
    }
}
