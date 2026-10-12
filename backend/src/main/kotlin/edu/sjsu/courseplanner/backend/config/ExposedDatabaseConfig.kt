package edu.sjsu.courseplanner.backend.config

import edu.sjsu.courseplanner.backend.repository.plannerSchemaTables
import javax.sql.DataSource
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.SchemaUtils
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class ExposedDatabaseConfig {

    @Bean
    fun exposedDatabase(dataSource: DataSource): Database =
        Database.connect(dataSource)

    @Bean
    @ConditionalOnProperty(
        name = ["planner.exposed.schema-init.enabled"],
        havingValue = "true"
    )
    fun exposedSchemaInitializer(database: Database, dataSource: DataSource) = ApplicationRunner {
        transaction(database) {
            SchemaUtils.createMissingTablesAndColumns(*plannerSchemaTables)
        }

        migratePrerequisitePrimaryKey(dataSource = dataSource)
    }

    private fun migratePrerequisitePrimaryKey(dataSource: DataSource) {
        dataSource.connection.use { connection ->
            val metadata = connection.metaData
            val tableName = sequenceOf("prerequisites", "PREREQUISITES")
                .firstOrNull { candidate ->
                    metadata.getTables(connection.catalog, null, candidate, arrayOf("TABLE")).use { it.next() }
                } ?: return
            val primaryKeyColumns = mutableListOf<String>()
            var primaryKeyName: String? = null
            metadata.getPrimaryKeys(connection.catalog, null, tableName).use { keys ->
                while (keys.next()) {
                    primaryKeyName = keys.getString("PK_NAME")
                    primaryKeyColumns += keys.getString("COLUMN_NAME").lowercase()
                }
            }
            if ("prereq_type" in primaryKeyColumns) return

            if (metadata.databaseProductName.contains("mysql", ignoreCase = true)) {
                connection.createStatement().use {
                    it.execute(
                        "ALTER TABLE prerequisites DROP PRIMARY KEY, " +
                            "ADD PRIMARY KEY (course_id, prereq_course_id, prereq_type)"
                    )
                }
            } else if (metadata.databaseProductName.contains("h2", ignoreCase = true)) {
                val constraintName = primaryKeyName ?: error("Could not identify prerequisites primary key")
                val quote = metadata.identifierQuoteString.trim()
                connection.createStatement().use {
                    it.execute("ALTER TABLE prerequisites DROP CONSTRAINT $quote$constraintName$quote")
                    it.execute(
                        "ALTER TABLE prerequisites ADD PRIMARY KEY " +
                            "(course_id, prereq_course_id, prereq_type)"
                    )
                }
            } else {
                error("Unsupported database for prerequisites key migration: ${metadata.databaseProductName}")
            }
        }
    }
}