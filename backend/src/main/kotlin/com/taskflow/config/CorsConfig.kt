package com.taskflow.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

/** CORS rules; allowed origins come from `CORS_ALLOWED_ORIGINS` (comma separated). */
@Configuration
class CorsConfig(
    @Value("\${taskflow.cors.allowed-origins}") private val originsProperty: String,
) {
    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val origins = originsProperty.split(',').map { it.trim() }.filter { it.isNotEmpty() }
        val configuration = CorsConfiguration().apply {
            allowedOrigins = origins
            allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type", "Accept")
            exposedHeaders = listOf("Content-Disposition")
            allowCredentials = false // token auth, no cookies
            maxAge = 3600L
        }
        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", configuration)
        }
    }
}
