package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.GradeDistributionDto
import edu.sjsu.courseplanner.backend.dto.SectionDto
import edu.sjsu.courseplanner.backend.repository.GradeDistributionImportRecord
import edu.sjsu.courseplanner.backend.repository.GradeDistributionRepository
import org.apache.poi.ss.usermodel.WorkbookFactory
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile

@Service
class GradeDistributionService(
    private val gradeDistributionRepository: GradeDistributionRepository
) {

    fun importExcel(file: MultipartFile): Int {
        val records = mutableListOf<GradeDistributionImportRecord>()

        WorkbookFactory.create(file.inputStream).use { workbook ->
            val sheet = workbook.getSheetAt(0)

            // Row 0 contains:
            // ACADEMIC_YEAR, SEMESTER, DEPARTMENT, COURSE_NUMBER,
            // INSTRUCTOR, A, B, C, D, F
            for (rowIndex in 1..sheet.lastRowNum) {
                val row = sheet.getRow(rowIndex) ?: continue

                val academicYear = row.getCell(0)?.toString()?.trim().orEmpty()
                val semester = row.getCell(1)?.toString()?.trim().orEmpty()
                val department = row.getCell(2)?.toString()?.trim().orEmpty()
                val courseNumber = row.getCell(3)?.toString()?.trim().orEmpty()
                val instructor = row.getCell(4)?.toString()?.trim().orEmpty()

                if (courseNumber.isBlank() || instructor.isBlank()) {
                    continue
                }

                records += GradeDistributionImportRecord(
                    academicYear = academicYear,
                    semester = semester,
                    department = department,
                    courseNumber = courseNumber,
                    instructor = instructor,
                    aCount = numericCell(row.getCell(5)),
                    bCount = numericCell(row.getCell(6)),
                    cCount = numericCell(row.getCell(7)),
                    dCount = numericCell(row.getCell(8)),
                    fCount = numericCell(row.getCell(9))
                )
            }
        }

        return gradeDistributionRepository.replaceAll(records)
    }

    fun enrichSections(sections: List<SectionDto>): List<SectionDto> {
        if (sections.isEmpty()) {
            return sections
        }

        val distributions = gradeDistributionRepository.findAll()

        val distributionsByCourseAndInstructor =
            distributions.groupBy { distribution ->
                MatchKey(
                    course = normalizeCourseCode(distribution.courseNumber),
                    instructor = normalizeInstructor(distribution.instructor)
                )
            }

        return sections.map { section ->
            val key = MatchKey(
                course = normalizeCourseCode(section.courseCode),
                instructor = normalizeInstructor(section.instructor)
            )

            val matches = distributionsByCourseAndInstructor[key]
                .orEmpty()
                .sortedByDescending { semesterSortValue(it.semester) }

            section.copy(
                gradeDistributions = matches
            )
        }
    }

    private fun numericCell(cell: org.apache.poi.ss.usermodel.Cell?): Int {
        if (cell == null) return 0

        return when (cell.cellType) {
            org.apache.poi.ss.usermodel.CellType.NUMERIC ->
                cell.numericCellValue.toInt()

            org.apache.poi.ss.usermodel.CellType.STRING ->
                cell.stringCellValue.trim().toDoubleOrNull()?.toInt() ?: 0

            else -> 0
        }
    }

    /*
     * Spreadsheet:
     * BUS1 0020
     *
     * Catalog:
     * BUS1 20
     *
     * Both become:
     * BUS1 20
     */
    private fun normalizeCourseCode(value: String): String {
        val cleaned = value
            .uppercase()
            .trim()
            .replace(Regex("\\s+"), " ")

        val match = Regex("^([A-Z0-9]+)\\s+0*([0-9]+)([A-Z]*)$")
            .matchEntire(cleaned)

        if (match != null) {
            val department = match.groupValues[1]
            val number = match.groupValues[2]
            val suffix = match.groupValues[3]

            return "$department $number$suffix"
        }

        return cleaned
    }

    /*
     * Spreadsheet:
     * Rondilla,Joanne
     *
     * Section:
     * Joanne Rondilla
     *
     * Both become:
     * joanne rondilla
     *
     * Middle names are intentionally ignored because the section scraper
     * may not contain them.
     */
    private fun normalizeInstructor(value: String): String {
        val cleaned = value
            .lowercase()
            .replace(".", "")
            .trim()

        if (cleaned.isBlank() || cleaned == "staff" || cleaned.contains("tba")) {
            return cleaned
        }

        if (cleaned.contains(",")) {
            val pieces = cleaned.split(",", limit = 2)

            val lastName = pieces[0].trim()
            val firstPart = pieces.getOrNull(1)?.trim().orEmpty()
            val firstName = firstPart.split(Regex("\\s+"))
                .firstOrNull()
                .orEmpty()

            return "$firstName $lastName"
                .replace(Regex("\\s+"), " ")
                .trim()
        }

        val pieces = cleaned
            .split(Regex("\\s+"))
            .filter { it.isNotBlank() }

        if (pieces.size >= 2) {
            return "${pieces.first()} ${pieces.last()}"
        }

        return cleaned
    }

    private fun semesterSortValue(semester: String): Int {
        val cleaned = semester.lowercase().trim()

        val year = Regex("(\\d{4})")
            .find(cleaned)
            ?.value
            ?.toIntOrNull()
            ?: 0

        val season = when {
            cleaned.startsWith("winter") -> 1
            cleaned.startsWith("spring") -> 2
            cleaned.startsWith("summer") -> 3
            cleaned.startsWith("fall") -> 4
            else -> 0
        }

        return year * 10 + season
    }

    private data class MatchKey(
        val course: String,
        val instructor: String
    )
}