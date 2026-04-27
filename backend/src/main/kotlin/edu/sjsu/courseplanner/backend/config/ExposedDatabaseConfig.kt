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
    fun exposedSchemaInitializer(database: Database) = ApplicationRunner {
        transaction(database) {
            SchemaUtils.createMissingTablesAndColumns(*plannerSchemaTables)
        }
    }
}