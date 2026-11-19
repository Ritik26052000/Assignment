package com.taskflow.project

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

data class CreateProjectRequest(
    @field:NotBlank(message = "Project name is required")
    @field:Size(max = 100, message = "Project name must be at most 100 characters")
    @field:Schema(example = "Website redesign")
    val name: String = "",

    @field:Size(max = 1000, message = "Description must be at most 1000 characters")
    val description: String? = null,
)

data class ProjectDto(
    val id: UUID,
    val name: String,
    val description: String?,
    val ownerId: UUID,
    val createdAt: Instant,
)
