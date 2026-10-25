package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.service.SageImportService
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class SageController(
    private val sageImportService: SageImportService
) {

    @PostMapping("/sage/seed")
    fun seedSagePrograms(): Map<String, Any> {

        val importedPrograms =
            sageImportService.importSagePrograms()

        return mapOf(
            "status" to "ok",
            "message" to "SAGE programs seeded",
            "programsImported" to importedPrograms
        )
    }
}