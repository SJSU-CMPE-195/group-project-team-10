package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.AccountRoadmapDto
import tools.jackson.databind.ObjectMapper
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository

@Repository
class UserRoadmapRepository(
    private val database: Database,
    private val objectMapper: ObjectMapper
) {
    fun findByUserId(userId: Long): AccountRoadmapDto? = transaction(database) {
        val json = UserRoadmapsTable.selectAll()
            .where { UserRoadmapsTable.userId eq userId }
            .singleOrNull()
            ?.get(UserRoadmapsTable.roadmapJson)
            ?: return@transaction null
        objectMapper.readValue(json, AccountRoadmapDto::class.java)
    }

    fun save(userId: Long, roadmap: AccountRoadmapDto): AccountRoadmapDto = transaction(database) {
        val json = objectMapper.writeValueAsString(roadmap)
        val exists = UserRoadmapsTable.selectAll()
            .where { UserRoadmapsTable.userId eq userId }
            .limit(1)
            .any()
        if (exists) {
            UserRoadmapsTable.update({ UserRoadmapsTable.userId eq userId }) { statement ->
                statement[roadmapJson] = json
            }
        } else {
            UserRoadmapsTable.insert { statement ->
                statement[UserRoadmapsTable.userId] = userId
                statement[roadmapJson] = json
            }
        }
        roadmap
    }
}
