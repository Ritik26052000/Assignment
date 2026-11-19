package com.taskflow.activity

import java.time.Instant
import java.util.UUID

data class TaskActivityDto(
    val id: UUID,
    val taskId: UUID,
    val taskTitle: String,
    val type: ActivityType,
    val actorId: UUID,
    val actorName: String,
    val fromValue: String?,
    val toValue: String?,
    val createdAt: Instant,
)
