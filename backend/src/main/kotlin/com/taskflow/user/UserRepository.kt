package com.taskflow.user

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface UserRepository : JpaRepository<User, UUID> {

    fun findByEmail(email: String): User?

    fun existsByEmail(email: String): Boolean

    fun existsByEmailAndIdNot(email: String, id: UUID): Boolean

    fun findAllByOrderByNameAsc(): List<User>

    fun findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
        name: String,
        email: String,
        pageable: Pageable,
    ): Page<User>
}
