package edu.sjsu.courseplanner.backend.service

import org.apache.commons.csv.CSVFormat
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import java.nio.ByteBuffer

data class PrerequisiteCsvRow(
    val rowNumber: Int,
    val courseCode: String,
    val courseTitle: String,
    val prerequisites: String,
    val corequisites: String,
    val officialCourseUrl: String
)

data class ParsedPrerequisiteCsv(
    val sourceKey: String,
    val rows: List<PrerequisiteCsvRow>,
    val invalidRows: List<String>,
    val rowsRead: Int = rows.size + invalidRows.size
)

class PrerequisiteCsvParser {
    fun parse(sourceKey: String, bytes: ByteArray): ParsedPrerequisiteCsv {
        val content = decode(bytes)
        val format = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreEmptyLines(true)
            .setTrim(true)
            .get()
        val rows = mutableListOf<PrerequisiteCsvRow>()
        val invalidRows = mutableListOf<String>()
        var rowsRead = 0

        format.parse(content.reader()).use { parser ->
            val headers = parser.headerMap.keys.associateBy { it.trim().lowercase() }
            val urlHeader = when {
                "official_course_url" in headers -> headers.getValue("official_course_url")
                "course_catalog_url" in headers -> headers.getValue("course_catalog_url")
                else -> null
            }
            val required = setOf("course_code", "course_title", "prerequisites", "corequisites")
            val missing = required - headers.keys
            require(missing.isEmpty() && urlHeader != null) {
                "Invalid prerequisite CSV headers in $sourceKey; missing ${missing + if (urlHeader == null) setOf("official_course_url/course_catalog_url") else emptySet()}"
            }

            for (record in parser) {
                rowsRead++
                val rowNumber = record.recordNumber.toInt() + 1
                val code = record.get(headers.getValue("course_code")).trim()
                if (code.isBlank()) {
                    invalidRows += "$sourceKey row $rowNumber: course_code is blank"
                    continue
                }
                rows += PrerequisiteCsvRow(
                    rowNumber = rowNumber,
                    courseCode = code,
                    courseTitle = record.get(headers.getValue("course_title")).trim(),
                    prerequisites = record.get(headers.getValue("prerequisites")).trim(),
                    corequisites = record.get(headers.getValue("corequisites")).trim(),
                    officialCourseUrl = record.get(requireNotNull(urlHeader)).trim()
                )
            }
        }
        return ParsedPrerequisiteCsv(sourceKey, rows, invalidRows, rowsRead)
    }

    private fun decode(bytes: ByteArray): String {
        val utf8 = StandardCharsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
        return try {
            utf8.decode(ByteBuffer.wrap(bytes))
                .toString().removePrefix("\uFEFF")
        } catch (_: java.nio.charset.CharacterCodingException) {
            String(bytes, charset("windows-1252"))
        }
    }
}
