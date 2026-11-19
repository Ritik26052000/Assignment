package com.taskflow.project

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ProjectRepository : JpaRepository<Project, UUID> {

    fun findByOwnerIdOrderByCreatedAtDesc(ownerId: UUID): List<Project>

    fun existsByOwnerId(ownerId: UUID): Boolean

    /** Owner-scoped lookup: someone else's project is simply "not found". */
    fun findByIdAndOwnerId(id: UUID, ownerId: UUID): Project?
}
