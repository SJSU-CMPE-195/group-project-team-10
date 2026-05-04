package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.service.CatalogProgramImportService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/catalog-programs")
class CatalogProgramImportController(
    private val catalogProgramImportService: CatalogProgramImportService
) {
    @GetMapping("/supported")
    fun supportedPrograms() = catalogProgramImportService.supportedProgramKeys().sorted()

    @PostMapping("/import")
    fun importProgram(@RequestParam program: String) = catalogProgramImportService.importProgram(program)
}
