package com.taskflow.project

import com.taskflow.user.User
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EntityListeners
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "projects")
@EntityListeners(AuditingEntityListener::class)
class Project(
    @Column(name = "name", nullable = false, length = 100)
    var name: String,

    @Column(name = "description", length = 1000)
    var description: String?,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    var owner: User,

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,
) {
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Project) return false
        val thisId = id
        return thisId != null && thisId == other.id
    }

    override fun hashCode(): Int = Project::class.java.hashCode()

    override fun toString(): String = "Project(id=$id, name=$name)"
}
