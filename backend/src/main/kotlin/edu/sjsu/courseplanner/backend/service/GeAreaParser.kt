package edu.sjsu.courseplanner.backend.service

/** Recognized codes from the checked-in 2026 schedules; no legacy-area mapping. */
object GeAreaParser {
    val areas = listOf("1A", "1B", "1C", "2", "3", "3A", "3B", "4", "5A", "5B", "5C", "6", "E", "UD 2/5", "UD 3", "UD 4", "US1", "US2", "US3")

    fun parse(value: String?): List<String> {
        val text = value?.trim()?.uppercase() ?: return emptyList()
        if (!text.startsWith("GE:") && !text.startsWith("AI:")) return emptyList()
        val codes = text.substringAfter(':').split('+').flatMap { fragment ->
            when (val code = fragment.trim().replace(Regex("\\s+"), " ").removePrefix("AREA ")) {
                "US23" -> listOf("US2", "US3")
                // Unspecified US and alternatives such as 1Bor4 cannot establish coverage.
                else -> if (code in areas) listOf(code) else emptyList()
            }
        }.toSet()
        return areas.filter { it in codes }
    }
}
