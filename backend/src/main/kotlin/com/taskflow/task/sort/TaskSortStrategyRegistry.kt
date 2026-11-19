package com.taskflow.task.sort

import com.taskflow.common.ApiFieldError
import com.taskflow.common.BadRequestException
import com.taskflow.common.ErrorCodes
import org.springframework.stereotype.Component

/** A parsed `sort` query parameter. */
data class TaskSort(
    val strategy: TaskSortStrategy,
    val direction: SortDirection,
)

/**
 * Whitelist of sortable keys. Resolves the `sort=<key>[,asc|desc]` parameter to a strategy and
 * rejects anything else with a 400 instead of leaking a persistence error.
 */
@Component
class TaskSortStrategyRegistry(strategies: List<TaskSortStrategy>) {

    private val byKey: Map<String, TaskSortStrategy> = strategies.associateBy { it.key.lowercase() }

    val supportedKeys: List<String> = strategies.map { it.key }.sorted()

    /** Default ordering when `sort` is omitted: earliest due date first. */
    fun parse(raw: String?): TaskSort {
        if (raw.isNullOrBlank()) return defaultSort()

        val parts = raw.split(',').map { it.trim() }
        if (parts.size > 2 || parts[0].isEmpty()) throw invalid(raw)

        val strategy = byKey[parts[0].lowercase()] ?: throw invalid(raw)
        val direction = if (parts.size == 2) {
            SortDirection.parse(parts[1]) ?: throw invalid(raw)
        } else {
            SortDirection.ASC
        }
        return TaskSort(strategy, direction)
    }

    private fun defaultSort(): TaskSort {
        val strategy = byKey[DEFAULT_KEY.lowercase()] ?: byKey.values.first()
        return TaskSort(strategy, SortDirection.ASC)
    }

    private fun invalid(raw: String): BadRequestException {
        val message = "Invalid sort '$raw'. Use <key>,<asc|desc> with key one of: ${supportedKeys.joinToString(", ")}"
        return BadRequestException(
            message = message,
            code = ErrorCodes.INVALID_PARAMETER,
            fieldErrors = listOf(ApiFieldError("sort", message)),
        )
    }

    companion object {
        const val DEFAULT_KEY = "dueDate"
    }
}
