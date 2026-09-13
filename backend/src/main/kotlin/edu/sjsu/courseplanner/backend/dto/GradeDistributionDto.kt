package edu.sjsu.courseplanner.backend.dto

data class GradeDistributionDto(
    val academicYear: String,
    val semester: String,
    val courseNumber: String,
    val instructor: String,

    val aCount: Int,
    val bCount: Int,
    val cCount: Int,
    val dCount: Int,
    val fCount: Int
) {
    val total: Int
        get() = aCount + bCount + cCount + dCount + fCount

    val aPercent: Double
        get() = percentage(aCount)

    val bPercent: Double
        get() = percentage(bCount)

    val cPercent: Double
        get() = percentage(cCount)

    val dPercent: Double
        get() = percentage(dCount)

    val fPercent: Double
        get() = percentage(fCount)

    private fun percentage(count: Int): Double {
        if (total == 0) return 0.0
        return count.toDouble() / total * 100.0
    }
}