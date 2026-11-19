package com.taskflow.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import io.swagger.v3.oas.models.servers.Server
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {

    @Bean
    fun taskFlowOpenApi(): OpenAPI = OpenAPI()
        .info(
            Info()
                .title("TaskFlow API")
                .version("v1")
                .description(
                    "Team task tracker API. Register or log in via /api/v1/auth/*, then press " +
                        "\"Authorize\" and paste the returned token (without the Bearer prefix).",
                ),
        )
        .servers(listOf(Server().url("/").description("This server")))
        .components(
            Components().addSecuritySchemes(
                BEARER_SCHEME,
                SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT"),
            ),
        )
        .addSecurityItem(SecurityRequirement().addList(BEARER_SCHEME))

    companion object {
        const val BEARER_SCHEME = "bearerAuth"
    }
}
