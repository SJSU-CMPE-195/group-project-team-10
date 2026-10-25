package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.service.GeAreaParser
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class GeAreaParserTest {
    @Test
    fun `normalizes observed labels and combinations deterministically`() {
        assertEquals(listOf("4"), GeAreaParser.parse("GE: Area 4"))
        assertEquals(listOf("E"), GeAreaParser.parse("GE: E"))
        assertEquals(listOf("3"), GeAreaParser.parse("GE: WID+3"))
        assertEquals(listOf("5A", "5C"), GeAreaParser.parse("ge: 5C+5A+5C"))
        assertEquals(listOf("UD 3"), GeAreaParser.parse("GE: UD   3"))
        assertEquals(listOf("UD 2/5"), GeAreaParser.parse("GE: UD 2/5"))
        assertEquals(listOf("3", "US2", "US3"), GeAreaParser.parse("GE: 3+US23"))
        assertEquals(listOf("US1"), GeAreaParser.parse("AI: US1"))
    }

    @Test
    fun `ignores unknown ambiguous and non-GE values safely`() {
        listOf(null, "", "WID", "GWAR", "PE: PhysEd", "GE: unknown", "GE: 1Bor4", "GE: US").forEach {
            assertEquals(emptyList<String>(), GeAreaParser.parse(it))
        }
        assertEquals(listOf("4"), GeAreaParser.parse("GE: 4+US+unknown"))
    }
}
