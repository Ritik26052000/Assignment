package com.taskflow.task

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.util.UUID

/** One row of the grouped summary query. */
interface StatusCount {
    val status: TaskStatus
    val total: Long
}

interface TaskRepository : JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {

    /**
     * Owner-scoped lookup (tasks are owned through their project). A task that exists but lives in
     * someone else's project returns null, which the service turns into a 404.
     */
    @Query(
        "select t from Task t join fetch t.project p left join fetch t.assignee " +
            "where t.id = :id and p.owner.id = :ownerId",
    )
    fun findByIdAndOwnerId(@Param("id") id: UUID, @Param("ownerId") ownerId: UUID): Task?

    @Query("select t.status as status, count(t) as total from Task t where t.project.id = :projectId group by t.status")
    fun countByStatus(@Param("projectId") projectId: UUID): List<StatusCount>

    /** Overdue = due before [today] and not DONE. */
    fun countByProjectIdAndDueDateBeforeAndStatusNot(projectId: UUID, today: LocalDate, status: TaskStatus): Long

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Task t set t.assignee = null where t.assignee.id = :userId")
    fun clearAssignee(@Param("userId") userId: UUID): Int
}
