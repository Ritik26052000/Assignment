package com.taskflow.task.sort

import com.taskflow.task.Task
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Order
import jakarta.persistence.criteria.Root
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.util.UUID

/** Sorts by due date; tasks without a due date always come last, in both directions. */
@Component
class DueDateSortStrategy : TaskSortStrategy {

    override val key: String = "dueDate"

    override fun orders(root: Root<Task>, cb: CriteriaBuilder, direction: SortDirection): List<Order> {
        val dueDate = root.get<LocalDate>("dueDate")
        // Portable "NULLS LAST": rank 1 for NULL, 0 otherwise, sorted ascending first.
        val nullRank = cb.selectCase<Int>()
            .`when`(cb.isNull(dueDate), cb.literal(1))
            .otherwise(cb.literal(0))
        return listOf(
            cb.asc(nullRank),
            direction.order(cb, dueDate),
            cb.asc(root.get<UUID>("id")),
        )
    }
}
