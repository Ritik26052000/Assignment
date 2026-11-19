package com.taskflow.task.sort

import com.taskflow.task.Task
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Order
import jakarta.persistence.criteria.Root

enum class SortDirection {
    ASC,
    DESC;

    fun order(cb: CriteriaBuilder, expression: Expression<*>): Order =
        if (this == ASC) cb.asc(expression) else cb.desc(expression)

    companion object {
        fun parse(raw: String): SortDirection? = entries.firstOrNull { it.name.equals(raw.trim(), ignoreCase = true) }
    }
}

/**
 * Strategy pattern: one implementation per sortable key. The service never knows how a key is
 * sorted; adding a new key is a new `@Component` implementing this interface.
 *
 * Implementations must end with a stable tie-breaker so pages never overlap or skip rows.
 */
interface TaskSortStrategy {
    /** The public `sort=<key>,<direction>` key (whitelisted). */
    val key: String

    fun orders(root: Root<Task>, cb: CriteriaBuilder, direction: SortDirection): List<Order>
}
