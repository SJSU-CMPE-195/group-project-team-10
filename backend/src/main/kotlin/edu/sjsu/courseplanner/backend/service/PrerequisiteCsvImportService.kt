package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.PrerequisiteCsvImportDto
import edu.sjsu.courseplanner.backend.repository.PrerequisiteCsvImportRepository
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.Locale
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class PrerequisiteCsvImportService(
    private val repository: PrerequisiteCsvImportRepository,
    @Value("\${planner.catalog-prerequisites.directory:data/prereq}")
    private val configuredDirectory: String
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val parser = PrerequisiteCsvParser()

    fun import(program: String): PrerequisiteCsvImportDto {
        val keys = when (program.trim().lowercase(Locale.ROOT)) {
            "cmpe" -> listOf("cmpe_prereq.csv")
            "swe" -> listOf("swe_prereq.csv")
            "all" -> listOf("cmpe_prereq.csv", "swe_prereq.csv")
            else -> throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Unsupported prerequisite import program '$program'; expected cmpe, swe, or all"
            )
        }

        val directory = resolveDirectory()
        val parsedFiles = keys.map { key ->
            val file = directory.resolve(key)
            require(Files.isRegularFile(file)) { "Prerequisite CSV file not found: $file" }
            parser.parse(key, Files.readAllBytes(file))
        }
        logger.info(
            "Parsed prerequisite CSV input: files={}, rows={}, invalidRows={}",
            keys,
            parsedFiles.sumOf { it.rows.size },
            parsedFiles.sumOf { it.invalidRows.size }
        )
        val result = repository.importFiles(parsedFiles)
        logger.info(
            "Prerequisite CSV import finished: files={}, rowsRead={}, matched={}, created={}, " +
                "prerequisites={}, corequisites={}, unresolved={}, invalidRows={}, warnings={}",
            result.importedFiles,
            result.rowsRead,
            result.courseRecordsMatched,
            result.courseRecordsCreated,
            result.prerequisiteRelationshipsImported,
            result.corequisiteRelationshipsImported,
            result.unresolvedCourseCodes.size,
            result.invalidRows.size,
            result.warnings.size
        )
        return result
    }

    private fun resolveDirectory(): Path {
        val configured = Paths.get(configuredDirectory)
        val candidates = if (configured.isAbsolute) {
            listOf(configured)
        } else {
            listOf(configured, Paths.get("backend").resolve(configured), Paths.get("..").resolve(configured))
        }
        return candidates.firstOrNull { candidate ->
            Files.isRegularFile(candidate.resolve("cmpe_prereq.csv")) &&
                Files.isRegularFile(candidate.resolve("swe_prereq.csv"))
        }?.toAbsolutePath()?.normalize()
            ?: throw IllegalStateException(
                "Could not locate cmpe_prereq.csv and swe_prereq.csv under " +
                    candidates.joinToString()
            )
    }
}
