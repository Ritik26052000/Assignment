package com.taskflow.user

import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant
import java.util.UUID

@Schema(description = "A user's full profile (only ever returned for the caller themselves)")
data class UserDto(
    val id: UUID,
    val name: String,
    val email: String,
    val createdAt: Instant,
)

@Schema(description = "Minimal user info used for assignee pickers and task assignees (no email)")
data class UserSummaryDto(
    val id: UUID,
    val name: String,
)
