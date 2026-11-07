package edu.sjsu.courseplanner.backend.service

import org.apache.commons.csv.CSVFormat
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import java.nio.ByteBuffer

class TechnicalElectiveCsvParser {
    fun parse(sourceKey: String, bytes: ByteArray): List<ParsedCatalogCourse> {
        val content = decode(bytes)
        val format = CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreEmptyLines(true)
            .setTrim(true)
            .get()
        val courses = mutableListOf<ParsedCatalogCourse>()

        format.parse(content.reader()).use { parser ->
            val headers = parser.headerMap.keys.associateBy { normalizeHeader(it) }
            val codeHeader = headers["courseno"] ?: headers["coursecode"]
            val titleHeader = headers["coursetitle"]
            require(codeHeader != null && titleHeader != null) {
                "Invalid technical elective CSV headers in $sourceKey; expected Course No and Course Title"
            }

            for (record in parser) {
                val rawCode = record.get(codeHeader).replace('\uFFFD', ' ').trim()
                val code = COURSE_CODE.find(rawCode.uppercase())?.value
                    ?: throw IllegalArgumentException(
                        "Invalid course code in $sourceKey row ${record.recordNumber + 1}: $rawCode"
                    )
                val title = record.get(titleHeader).trim()
                require(title.isNotBlank()) {
                    "Course title is blank in $sourceKey row ${record.recordNumber + 1}"
                }
                courses += ParsedCatalogCourse(
                    courseCode = code,
                    courseTitle = title,
                    units = 3,
                    department = code.substringBefore(' '),
                    catalogCourseId = null
                )
            }
        }

        require(courses.isNotEmpty()) { "No technical elective courses found in $sourceKey" }
        return courses.distinctBy { it.courseCode }
    }

    private fun normalizeHeader(value: String): String =
        value.removePrefix("\uFEFF").lowercase().filter(Char::isLetterOrDigit)

    private fun decode(bytes: ByteArray): String {
        val utf8 = StandardCharsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
        return try {
            utf8.decode(ByteBuffer.wrap(bytes)).toString().removePrefix("\uFEFF")
        } catch (_: java.nio.charset.CharacterCodingException) {
            String(bytes, charset("windows-1252"))
        }
    }

    private companion object {
        val COURSE_CODE = Regex("""[A-Z]{2,5}\s+\d{1,3}(?:-\d{2})?[A-Z]?""")
    }
}
