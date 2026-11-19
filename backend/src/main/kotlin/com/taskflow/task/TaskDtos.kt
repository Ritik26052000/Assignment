package com.taskflow.task

import com.taskflow.user.UserSummaryDto
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@Schema(description = "Create a task. Status defaults to TODO and priority to MEDIUM. dueDate must not be in the past.")
data class CreateTaskRequest(
    @field:NotBlank(message = "Title is required")
    @field:Size(max = 120, message = "Title must be at most 120 characters")
    @field:Schema(example = "Write the project brief")
    val title: String = "",

    @field:Size(max = 2000, message = "Description must be at most 2000 characters")
    val description: String? = null,

    val status: TaskStatus? = null,

    val priority: TaskPriority? = null,

    @field:Schema(example = "2030-01-31")
    val dueDate: LocalDate? = null,

    val assigneeId: UUID? = null,
)

@Schema(
    description = "Update a task. Title is required; description, dueDate and assigneeId are replaced " +
        "(null clears them); status and priority keep their current value when omitted. " +
        "dueDate is only rejected when it CHANGES to a past date.",
)
data class UpdateTaskRequest(
    @field:NotBlank(message = "Title is required")
    @field:Size(max = 120, message = "Title must be at most 120 characters")
    val title: String = "",

    @field:Size(max = 2000, message = "Description must be at most 2000 characters")
    val description: String? = null,

    val status: TaskStatus? = null,

    val priority: TaskPriority? = null,

    val dueDate: LocalDate? = null,

    val assigneeId: UUID? = null,
)

data class UpdateTaskStatusRequest(
    @field:NotNull(message = "Status is required")
    val status: TaskStatus? = null,
)

data class TaskDto(
    val id: UUID,
    val projectId: UUID,
    val title: String,
    val description: String?,
    val status: TaskStatus,
    val priority: TaskPriority,
    val dueDate: LocalDate?,
    val assigneeId: UUID?,
    val assignee: UserSummaryDto?,
    val createdAt: Instant,
    val updatedAt: Instant,
)

@Schema(description = "Task counts for a project. byStatus always contains every status (zero-filled).")
data class ProjectSummaryDto(
    val projectId: UUID,
    val total: Long,
    @field:Schema(description = "dueDate is before today (UTC) and status is not DONE")
    val overdue: Long,
    val byStatus: Map<TaskStatus, Long>,
)
