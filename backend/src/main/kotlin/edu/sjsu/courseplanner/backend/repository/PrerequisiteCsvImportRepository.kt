package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.PrerequisiteCsvImportDto
import edu.sjsu.courseplanner.backend.service.ParsedPrerequisiteCsv
import edu.sjsu.courseplanner.backend.service.PrerequisiteCsvRow
import java.net.URI
import java.util.Locale
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository

private data class ExistingCourse(
    val id: Int,
    val code: String,
    val title: String,
    val officialUrl: String?
)

private data class CourseRowImport(
    val sourceKey: String,
    val row: PrerequisiteCsvRow,
    val normalizedCode: String
)

private data class ParsedCondition(
    val courseCodes: List<String>,
    val relationshipCourseCodes: List<String>,
    val expressionJson: String?,
    val requiresReview: Boolean
)

@Repository
class PrerequisiteCsvImportRepository(
    private val database: Database
) {
    fun importFiles(files: List<ParsedPrerequisiteCsv>): PrerequisiteCsvImportDto =
        transaction(database) {
            val warnings = mutableListOf<String>()
            val unresolved = linkedSetOf<String>()
            val invalidRows = files.flatMap { it.invalidRows }.toMutableList()
            val importedRows = files.flatMap { file ->
                file.rows.mapNotNull { row ->
                    val normalized = normalizeCourseCode(row.courseCode)
                    if (normalized == null) {
                        invalidRows += "${file.sourceKey} row ${row.rowNumber}: invalid course_code '${row.courseCode}'"
                        null
                    } else {
                        CourseRowImport(file.sourceKey, row, normalized)
                    }
                }
            }
            val conflictedSourceRows = importedRows
                .groupBy { it.sourceKey to it.normalizedCode }
                .filterValues { rows ->
                    rows.distinctBy {
                        listOf(
                            it.row.courseTitle,
                            it.row.prerequisites,
                            it.row.corequisites,
                            it.row.officialCourseUrl
                        )
                    }.size > 1
                }
                .keys
            conflictedSourceRows.forEach { (source, code) ->
                invalidRows += "$source: conflicting duplicate rows for $code were skipped"
            }
            val usableRows = importedRows.filterNot { (it.sourceKey to it.normalizedCode) in conflictedSourceRows }

            val existing = CoursesTable.selectAll().map(::toExistingCourse)
            val existingByCode = existing.groupBy { normalizeCourseCode(it.code) }
            val ambiguousExisting = existingByCode.filterValues { it.size > 1 }.keys.filterNotNull().toSet()
            ambiguousExisting.forEach { code ->
                warnings += "$code: multiple existing course rows normalize to the same course code; not selected"
            }
            val courseIdsByCode = existingByCode
                .filterKeys { it != null && it !in ambiguousExisting }
                .mapValues { (_, records) -> records.single().id }
                .toMutableMap()
            val matchedCourseIds = mutableSetOf<Int>()
            var createdCourses = 0
            val uniqueRows = usableRows.distinctBy { it.normalizedCode }
            val duplicateCodes = usableRows.groupBy { it.normalizedCode }
                .filterValues { it.map { row -> row.row.courseTitle.trim() }.filter(String::isNotBlank).distinct().size > 1 }
                .keys
            duplicateCodes.forEach { code ->
                warnings += "$code: source files provide conflicting titles; existing metadata was retained"
            }

            uniqueRows.forEach { course ->
                if (course.normalizedCode in ambiguousExisting || course.normalizedCode in duplicateCodes) {
                    unresolved += course.normalizedCode
                    return@forEach
                }
                val existingId = courseIdsByCode[course.normalizedCode]
                val url = officialCatalogUrl(course.row.officialCourseUrl)
                if (existingId != null) {
                    matchedCourseIds += existingId
                    val canUpdateTitle = course.row.courseTitle.isNotBlank() &&
                        (course.normalizedCode !in duplicateCodes)
                    if (canUpdateTitle || url != null) {
                        CoursesTable.update({ CoursesTable.id eq existingId }) { statement ->
                            if (canUpdateTitle) statement[courseTitle] = course.row.courseTitle.take(200)
                            if (url != null) statement[officialCatalogUrl] = url
                        }
                    }
                } else if (
                    course.row.courseTitle.isNotBlank() &&
                    url != null &&
                    course.normalizedCode !in duplicateCodes
                ) {
                    val createdId = CoursesTable.insert { statement ->
                        statement[courseCode] = course.normalizedCode
                        statement[courseTitle] = course.row.courseTitle.take(200)
                        statement[units] = 0
                        statement[department] = course.normalizedCode.substringBefore(' ')
                        statement[officialCatalogUrl] = url
                    } get CoursesTable.id
                    courseIdsByCode[course.normalizedCode] = createdId
                    createdCourses++
                } else {
                    unresolved += course.normalizedCode
                    warnings += "${course.normalizedCode}: not in the database and CSV metadata is insufficient to create a catalog record"
                }
            }

            val prerequisiteRelations = mutableSetOf<Pair<Int, Int>>()
            val corequisiteRelations = mutableSetOf<Pair<Int, Int>>()
            usableRows.forEach { course ->
                val courseId = courseIdsByCode[course.normalizedCode]
                if (courseId == null) {
                    unresolved += course.normalizedCode
                    return@forEach
                }
                listOf(
                    "prereq" to course.row.prerequisites,
                    "coreq" to course.row.corequisites
                ).forEach { (relationshipType, originalText) ->
                    val parsed = parseCondition(originalText)
                    if (parsed.requiresReview && originalText.isNotBlank()) {
                        warnings += "${course.normalizedCode} $relationshipType: alternative or complex expression retained for manual review"
                    }
                    val resolvedCodes = parsed.courseCodes.mapNotNull { code ->
                        val id = courseIdsByCode[code]
                            ?: existingByCode[code]?.singleOrNull()?.id
                        if (id == null) {
                            unresolved += code
                            warnings += "${course.normalizedCode} $relationshipType: referenced course $code was not found"
                        }
                        id?.let { code to it }
                    }.toMap()
                    val relationIds = parsed.relationshipCourseCodes
                        .mapNotNull(resolvedCodes::get)
                        .filter { it != courseId }
                        .distinct()

                    syncSourceCondition(
                        sourceKey = course.sourceKey,
                        courseId = courseId,
                        relationshipType = relationshipType,
                        originalText = originalText,
                        expressionJson = parsed.expressionJson,
                        officialUrl = officialCatalogUrl(course.row.officialCourseUrl),
                        prerequisiteIds = relationIds
                    )
                    val reportedRelations =
                        if (relationshipType == "prereq") prerequisiteRelations else corequisiteRelations
                    relationIds.forEach { reportedRelations += courseId to it }
                }
            }

            if (createdCourses > 0) {
                warnings += "New course records use 0 units because the prerequisite CSVs do not include unit counts"
            }

            PrerequisiteCsvImportDto(
                importedFiles = files.map { it.sourceKey },
                rowsRead = files.sumOf { it.rowsRead },
                courseRecordsMatched = matchedCourseIds.size,
                prerequisiteRelationshipsImported = prerequisiteRelations.size,
                corequisiteRelationshipsImported = corequisiteRelations.size,
                courseRecordsCreated = createdCourses,
                unresolvedCourseCodes = unresolved.sorted(),
                invalidRows = invalidRows,
                warnings = warnings.distinct()
            )
        }

    private fun syncSourceCondition(
        sourceKey: String,
        courseId: Int,
        relationshipType: String,
        originalText: String,
        expressionJson: String?,
        officialUrl: String?,
        prerequisiteIds: List<Int>
    ) {
        val oldEdges = PrerequisiteCsvEdgesTable.selectAll()
            .where {
                (PrerequisiteCsvEdgesTable.sourceKey eq sourceKey)
                    .and(PrerequisiteCsvEdgesTable.courseId eq courseId)
                    .and(PrerequisiteCsvEdgesTable.relationshipType eq relationshipType)
            }
            .map { row ->
                Triple(
                    row[PrerequisiteCsvEdgesTable.prereqCourseId],
                    row[PrerequisiteCsvEdgesTable.relationshipType],
                    row[PrerequisiteCsvEdgesTable.importerCreatedEdge]
                )
            }
        PrerequisiteCsvEdgesTable.deleteWhere {
            (PrerequisiteCsvEdgesTable.sourceKey eq sourceKey) and
                (PrerequisiteCsvEdgesTable.courseId eq courseId) and
                (PrerequisiteCsvEdgesTable.relationshipType eq relationshipType)
        }
        PrerequisiteCsvConditionsTable.deleteWhere {
            (PrerequisiteCsvConditionsTable.courseId eq courseId) and
                (PrerequisiteCsvConditionsTable.relationshipType eq relationshipType) and
                (PrerequisiteCsvConditionsTable.sourceKey eq sourceKey)
        }
        PrerequisiteCsvConditionsTable.insert { statement ->
            statement[PrerequisiteCsvConditionsTable.courseId] = courseId
            statement[PrerequisiteCsvConditionsTable.relationshipType] = relationshipType
            statement[PrerequisiteCsvConditionsTable.sourceKey] = sourceKey
            statement[PrerequisiteCsvConditionsTable.originalText] = originalText
            statement[PrerequisiteCsvConditionsTable.expressionJson] = expressionJson
            statement[PrerequisiteCsvConditionsTable.officialCourseUrl] = officialUrl
        }
        oldEdges.forEach { (prereqCourseId, oldType, importerCreated) ->
            val stillOwned = PrerequisiteCsvEdgesTable.selectAll().any {
                (it[PrerequisiteCsvEdgesTable.courseId] == courseId) &&
                    (it[PrerequisiteCsvEdgesTable.prereqCourseId] == prereqCourseId) &&
                    (it[PrerequisiteCsvEdgesTable.relationshipType] == oldType)
            }
            if (!stillOwned && importerCreated) {
                PrerequisitesTable.deleteWhere {
                    (PrerequisitesTable.courseId eq courseId) and
                        (PrerequisitesTable.prereqCourseId eq prereqCourseId) and
                        (PrerequisitesTable.prereqType eq oldType)
                }
            }
        }

        prerequisiteIds.forEach { prereqCourseId ->
            val existingEdge = PrerequisitesTable.selectAll().any {
                it[PrerequisitesTable.courseId] == courseId &&
                    it[PrerequisitesTable.prereqCourseId] == prereqCourseId &&
                    it[PrerequisitesTable.prereqType] == relationshipType
            }
            val importerCreated = existingEdge &&
                PrerequisiteCsvEdgesTable.selectAll().any {
                    it[PrerequisiteCsvEdgesTable.courseId] == courseId &&
                        it[PrerequisiteCsvEdgesTable.prereqCourseId] == prereqCourseId &&
                        it[PrerequisiteCsvEdgesTable.relationshipType] == relationshipType &&
                        it[PrerequisiteCsvEdgesTable.importerCreatedEdge]
                }
            if (!existingEdge) {
                PrerequisitesTable.insert { statement ->
                    statement[PrerequisitesTable.courseId] = courseId
                    statement[PrerequisitesTable.prereqCourseId] = prereqCourseId
                    statement[PrerequisitesTable.prereqType] = relationshipType
                }
            }
            PrerequisiteCsvEdgesTable.insert { statement ->
                statement[PrerequisiteCsvEdgesTable.courseId] = courseId
                statement[PrerequisiteCsvEdgesTable.prereqCourseId] = prereqCourseId
                statement[PrerequisiteCsvEdgesTable.relationshipType] = relationshipType
                statement[PrerequisiteCsvEdgesTable.sourceKey] = sourceKey
                statement[PrerequisiteCsvEdgesTable.importerCreatedEdge] = importerCreated || !existingEdge
            }
        }
    }

    private fun parseCondition(text: String): ParsedCondition {
        if (text.isBlank()) return ParsedCondition(emptyList(), emptyList(), null, false)
        val labelStripped = text.replaceFirst(PREREQUISITE_LABEL_REGEX, "")
        val noteStart = NON_PREREQUISITE_NOTES_REGEX.find(labelStripped)?.range?.first
        val expressionText = if (noteStart == null) labelStripped else labelStripped.substring(0, noteStart)
        val codeMatches = COURSE_CODE_REGEX.findAll(expressionText).toList()
        val codes = codeMatches.asSequence().flatMap { match ->
            sequenceOf(
                normalizeCourseCode("${match.groupValues[1]} ${match.groupValues[2]}"),
                match.groupValues[3].takeIf(String::isNotBlank)
                    ?.let { normalizeCourseCode("${match.groupValues[1]} $it") }
            ).filterNotNull()
        }.distinct().toList()
        val disjunction = DISJUNCTION_REGEX.containsMatchIn(expressionText) ||
            MAJOR_SPECIFIC_BRANCH_REGEX.findAll(expressionText).count() > 1
        val safeConjunction = codes.isNotEmpty() && !disjunction
        val expression = if (safeConjunction) {
            """{"operator":"AND","courses":[${codes.joinToString(",") { "\"$it\"" }}]}"""
        } else {
            null
        }
        return ParsedCondition(
            courseCodes = codes,
            relationshipCourseCodes = if (safeConjunction) codes else emptyList(),
            expressionJson = expression,
            requiresReview = codes.isNotEmpty() && !safeConjunction
        )
    }

    private fun toExistingCourse(row: ResultRow) = ExistingCourse(
        id = row[CoursesTable.id],
        code = row[CoursesTable.courseCode],
        title = row[CoursesTable.courseTitle],
        officialUrl = row[CoursesTable.officialCatalogUrl]
    )

    companion object {
        private val COURSE_CODE_REGEX =
            Regex("""\b([A-Z]{2,5})\s+(\d{1,3}[A-Z]{0,2})(?:\s*/\s*(\d{1,3}[A-Z]{0,2}))?\b""")
        private val DISJUNCTION_REGEX =
            Regex("""\bOR\b(?!\s+BETTER\b)|\bEITHER\b|/""", RegexOption.IGNORE_CASE)
        private val PREREQUISITE_LABEL_REGEX =
            Regex("""^\s*(?:pre|co)requisite(?:\(s\))?\s*:\s*""", RegexOption.IGNORE_CASE)
        private val NON_PREREQUISITE_NOTES_REGEX = Regex(
            """\bAllowed\s+(?:Declared\s+)?Majors\s*:|(?:Computer|Software)\s+Engineering\s+Majors\s+Only|Engineering\s+Majors\s+Only""",
            RegexOption.IGNORE_CASE
        )
        private val MAJOR_SPECIFIC_BRANCH_REGEX =
            Regex("""\bfor\s+[^:;]+?\s+major\s*:""", RegexOption.IGNORE_CASE)
        private val COURSE_CODE_FORMAT = Regex("""^([A-Z]{2,5})\s*(\d{1,3}[A-Z]{0,2})$""")

        fun normalizeCourseCode(raw: String): String? {
            val canonical = raw.trim().uppercase(Locale.ROOT)
                .replace(Regex("""[\s-]+"""), " ")
            val match = COURSE_CODE_FORMAT.matchEntire(canonical) ?: return null
            return "${match.groupValues[1]} ${match.groupValues[2]}"
        }

        private fun officialCatalogUrl(raw: String): String? {
            if (raw.isBlank()) return null
            return try {
                URI(raw.trim()).takeIf {
                    it.scheme.equals("https", ignoreCase = true) &&
                        it.host.equals("catalog.sjsu.edu", ignoreCase = true)
                }?.toString()
            } catch (_: java.net.URISyntaxException) {
                null
            } catch (_: IllegalArgumentException) {
                null
            }
        }
    }
}
