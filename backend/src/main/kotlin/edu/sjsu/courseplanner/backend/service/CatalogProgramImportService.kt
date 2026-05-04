package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.CatalogProgramImportResultDto
import edu.sjsu.courseplanner.backend.repository.CatalogProgramImportRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CatalogProgramImportService(
    private val catalogProgramScraperService: CatalogProgramScraperService,
    private val catalogProgramImportRepository: CatalogProgramImportRepository
) {
    fun supportedProgramKeys(): Set<String> = catalogProgramScraperService.supportedProgramKeys()

    @Transactional
    fun importProgram(programKey: String): CatalogProgramImportResultDto {
        val parsed = catalogProgramScraperService.scrapeProgram(programKey)
        return catalogProgramImportRepository.importProgram(parsed)
    }
}
