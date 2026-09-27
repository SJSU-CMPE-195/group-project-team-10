package edu.sjsu.courseplanner.backend.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

// admin acc comes from ADMIN_EMAILS allowlist and role is synced at user sign in
@Component
class AdminProperties(
    @Value("\${planner.admin-emails:}") adminEmails: String
) {
    private val emails: Set<String> = adminEmails
        .split(",")
        .map { it.trim().lowercase() }
        .filter { it.isNotEmpty() }
        .toSet()

    fun isAdminEmail(email: String): Boolean = email.trim().lowercase() in emails

    fun roleFor(email: String): String = if (isAdminEmail(email)) ROLE_ADMIN else ROLE_USER

    companion object {
        const val ROLE_ADMIN = "ADMIN"
        const val ROLE_USER = "USER"
    }
}
