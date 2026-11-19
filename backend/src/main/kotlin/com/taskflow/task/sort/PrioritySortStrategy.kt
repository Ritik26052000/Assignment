package com.taskflow.task.sort

import com.taskflow.task.Task
import com.taskflow.task.TaskPriority
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Order
import jakarta.persistence.criteria.Root
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * Sorts by semantic priority (LOW < MEDIUM < HIGH). The column is stored as a STRING enum, so a plain
 * ORDER BY would be alphabetical (HIGH, LOW, MEDIUM); a CASE expression gives the correct rank.
 */
@Component
class PrioritySortStrategy : TaskSortStrategy {

    override val key: String = "priority"

    override fun orders(root: Root<Task>, cb: CriteriaBuilder, direction: SortDirection): List<Order> {
        val priority = root.get<TaskPriority>("priority")
        val rank = cb.selectCase<Int>()
            .`when`(cb.equal(priority, TaskPriority.HIGH), cb.literal(3))
            .`when`(cb.equal(priority, TaskPriority.MEDIUM), cb.literal(2))
            .otherwise(cb.literal(1))
        return listOf(
            direction.order(cb, rank),
            cb.asc(root.get<UUID>("id")),
        )
    }
}
