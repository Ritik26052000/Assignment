package com.taskflow.security

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Bound from `taskflow.jwt.*` (env: `JWT_SECRET`, `JWT_EXPIRATION_MINUTES`).
 * The secret is validated (fail-fast) by [JwtService] at startup.
 */
@ConfigurationProperties(prefix = "taskflow.jwt")
data class JwtProperties(
    val secret: String = "",
    val expirationMinutes: Long = 60,
)
