package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.service.GradeDistributionService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/grade-distributions")
class GradeDistributionController(
    private val gradeDistributionService: GradeDistributionService
) {

    @PostMapping("/import")
    fun importGradeDistributions(
        @RequestParam("file") file: MultipartFile
    ): ResponseEntity<Map<String, Any>> {

        val imported = gradeDistributionService.importExcel(file)

        return ResponseEntity.ok(
            mapOf(
                "message" to "Grade distribution import completed",
                "rowsImported" to imported
            )
        )
    }
}