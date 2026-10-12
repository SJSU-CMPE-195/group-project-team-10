package edu.sjsu.courseplanner.backend.service

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.KotlinModule
import edu.sjsu.courseplanner.backend.dto.SageSeedFileDto
import edu.sjsu.courseplanner.backend.repository.SageRepository
import org.springframework.stereotype.Service
import java.io.File

@Service
class SageImportService(
    private val sageRepository: SageRepository
) {

    private val objectMapper =
        ObjectMapper()
            .registerModule(KotlinModule.Builder().build())
            .configure(
                DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                false
            )

    fun importSagePrograms(): Int {

        val file = File("../data/sage_programs.json")

        if (!file.exists()) {
            throw IllegalStateException(
                "SAGE data file not found: ${file.absolutePath}"
            )
        }

        val seedData = objectMapper.readValue(
            file,
            SageSeedFileDto::class.java
        )

        var importedPrograms = 0

        for (program in seedData.programs) {

            val majorId =
                sageRepository.findMajorIdByName(
                    program.undergraduateMajor
                )
                    ?: throw IllegalStateException(
                        "Major not found: ${program.undergraduateMajor}"
                    )

            val sageProgramId =
                sageRepository.ensureSageProgram(
                    undergraduateMajorId = majorId,
                    graduateProgramName =
                        program.graduateProgram,
                    minimumGpa =
                        program.minimumGpa,
                    minimumUndergradUnits =
                        program.minimumUndergradUnits,
                    maximumUndergradUnits =
                        program.maximumUndergradUnits,
                    totalProgramUnits =
                        program.totalProgramUnits
                )

            for (requirement in program.requirements) {

                val requirementId =
                    sageRepository.ensureSageRequirement(
                        sageProgramId = sageProgramId,
                        requirementName =
                            requirement.name,
                        requiredUnits =
                            requirement.requiredUnits,
                        description =
                            requirement.description
                    )

                for (course in requirement.courses) {

                    val courseId =
                        sageRepository.ensureCourse(
                            courseCode =
                                course.courseCode,
                            courseTitle =
                                course.courseTitle
                        )

                    sageRepository.ensureSageCourse(
                        requirementId =
                            requirementId,
                        courseId =
                            courseId,
                        courseRole =
                            course.role,
                        doubleCountEligible =
                            course.doubleCountEligible
                    )
                }
            }

            importedPrograms++
        }

        return importedPrograms
    }
}