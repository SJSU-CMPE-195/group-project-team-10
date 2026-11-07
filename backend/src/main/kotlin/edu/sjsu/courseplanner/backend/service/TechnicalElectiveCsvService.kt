package edu.sjsu.courseplanner.backend.service

import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.Locale
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class TechnicalElectiveCsvService(
    @Value("\${planner.catalog-electives.directory:data/electives}")
    private val configuredDirectory: String
) {
    private val parser = TechnicalElectiveCsvParser()

    fun load(programKey: String): List<ParsedCatalogCourse> {
        val normalizedKey = programKey.trim().lowercase(Locale.ROOT)
        val fileName = when (normalizedKey) {
            "cmpe" -> "cmpe_elective.csv"
            "swe" -> "swe_elective.csv"
            else -> throw IllegalArgumentException("Unsupported technical elective program '$programKey'")
        }
        val file = resolveDirectory().resolve(fileName)
        require(Files.isRegularFile(file)) { "Technical elective CSV file not found: $file" }
        return parser.parse(fileName, Files.readAllBytes(file))
    }

    private fun resolveDirectory(): Path {
        val configured = Paths.get(configuredDirectory)
        val candidates = if (configured.isAbsolute) {
            listOf(configured)
        } else {
            listOf(configured, Paths.get("backend").resolve(configured), Paths.get("..").resolve(configured))
        }
        return candidates.firstOrNull { candidate ->
            Files.isRegularFile(candidate.resolve("cmpe_elective.csv")) &&
                Files.isRegularFile(candidate.resolve("swe_elective.csv"))
        }?.toAbsolutePath()?.normalize()
            ?: throw IllegalStateException(
                "Could not locate cmpe_elective.csv and swe_elective.csv under " +
                    candidates.joinToString()
            )
    }
}
