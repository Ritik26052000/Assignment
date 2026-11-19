package com.taskflow.task.spec

import com.taskflow.task.Task
import com.taskflow.task.TaskPriority
import com.taskflow.task.TaskStatus
import com.taskflow.task.sort.SortDirection
import com.taskflow.task.sort.TaskSortStrategy
import org.springframework.data.jpa.domain.Specification
import java.util.UUID

/**
 * Specification pattern: one tiny, composable predicate per filter, AND-combined by [forProject],
 * so the service has no `if` chains and no hand-written query per filter combination.
 */
object TaskSpecifications {

    fun inProject(projectId: UUID): Specification<Task> =
        Specification { root, _, cb -> cb.equal(root.get<Any>("project").get<UUID>("id"), projectId) }

    fun hasStatus(status: TaskStatus): Specification<Task> =
        Specification { root, _, cb -> cb.equal(root.get<TaskStatus>("status"), status) }

    fun hasPriority(priority: TaskPriority): Specification<Task> =
        Specification { root, _, cb -> cb.equal(root.get<TaskPriority>("priority"), priority) }

    fun assignedTo(userId: UUID): Specification<Task> =
        Specification { root, _, cb -> cb.equal(root.get<Any>("assignee").get<UUID>("id"), userId) }

    fun unassigned(): Specification<Task> =
        Specification { root, _, cb -> cb.isNull(root.get<Any>("assignee")) }

    /** Project scope plus whichever optional filters are present. */
    fun forProject(projectId: UUID, filter: TaskFilter): Specification<Task> {
        val specs = buildList {
            add(inProject(projectId))
            filter.status?.let { add(hasStatus(it)) }
            filter.priority?.let { add(hasPriority(it)) }
            when (val assignee = filter.assignee) {
                AssigneeFilter.All -> Unit
                AssigneeFilter.Unassigned -> add(unassigned())
                is AssigneeFilter.User -> add(assignedTo(assignee.id))
            }
        }
        return Specification.allOf(specs)
    }

    /**
     * Applies the ORDER BY produced by a [TaskSortStrategy]. It adds no predicate; it only sets the
     * ordering on the select query (the count query for paging is left unordered).
     */
    fun sortedBy(strategy: TaskSortStrategy, direction: SortDirection): Specification<Task> =
        Specification { root, query, cb ->
            if (query != null && query.resultType == Task::class.java) {
                query.orderBy(strategy.orders(root, cb, direction))
            }
            null
        }
}
