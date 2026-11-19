package com.taskflow.activity

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface TaskActivityRepository : JpaRepository<TaskActivity, UUID> {

    /** Newest first; actor + task are fetched so mapping never lazy-loads. */
    @Query(
        "select a from TaskActivity a join fetch a.actor join fetch a.task " +
            "where a.task.id = :taskId order by a.createdAt desc, a.id desc",
    )
    fun findByTaskId(@Param("taskId") taskId: UUID): List<TaskActivity>

    /** Project-wide feed, newest first. Pass PageRequest.of(0, limit) for a capped list. */
    @Query(
        "select a from TaskActivity a join fetch a.actor join fetch a.task t " +
            "where t.project.id = :projectId order by a.createdAt desc, a.id desc",
    )
    fun findRecentByProjectId(
        @Param("projectId") projectId: UUID,
        pageable: Pageable,
    ): List<TaskActivity>

    @Modifying(flushAutomatically = true)
    @Query("delete from TaskActivity a where a.task.id = :taskId")
    fun deleteByTaskId(@Param("taskId") taskId: UUID)

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from TaskActivity a where a.actor.id = :actorId")
    fun deleteByActorId(@Param("actorId") actorId: UUID): Int
}
