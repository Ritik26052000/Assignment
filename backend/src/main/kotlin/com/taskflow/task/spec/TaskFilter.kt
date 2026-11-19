package com.taskflow.task.spec

import com.taskflow.common.BadRequestException
import com.taskflow.common.ApiFieldError
import com.taskflow.common.ErrorCodes
import com.taskflow.task.TaskPriority
import com.taskflow.task.TaskStatus
import java.util.UUID

/** Which assignees to include in a task listing. */
sealed interface AssigneeFilter {
    data object All : AssigneeFilter
    data object Unassigned : AssigneeFilter
    data class User(val id: UUID) : AssigneeFilter

    companion object {
        const val UNASSIGNED_KEYWORD = "unassigned"

        /** `null`/blank = no filter, `unassigned` = tasks without assignee, otherwise a user UUID. */
        fun parse(raw: String?): AssigneeFilter {
            val value = raw?.trim()
            if (value.isNullOrEmpty()) return All
            if (value.equals(UNASSIGNED_KEYWORD, ignoreCase = true)) return Unassigned
            return try {
                User(UUID.fromString(value))
            } catch (e: IllegalArgumentException) {
                val message = "assigneeId must be a user id or '$UNASSIGNED_KEYWORD'"
                throw BadRequestException(
                    message = message,
                    code = ErrorCodes.INVALID_PARAMETER,
                    fieldErrors = listOf(ApiFieldError("assigneeId", message)),
                )
            }
        }
    }
}

/** The optional, AND-combined filters of the task listing. */
data class TaskFilter(
    val status: TaskStatus? = null,
    val priority: TaskPriority? = null,
    val assignee: AssigneeFilter = AssigneeFilter.All,
)
