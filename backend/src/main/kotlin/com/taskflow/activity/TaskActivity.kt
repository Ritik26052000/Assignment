package com.taskflow.activity

import com.taskflow.task.Task
import com.taskflow.user.User
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EntityListeners
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant
import java.util.UUID

enum class ActivityType {
    STATUS_CHANGED,
}

/** One row per real status change on a task: who, from what, to what, when. */
@Entity
@Table(name = "task_activities")
@EntityListeners(AuditingEntityListener::class)
class TaskActivity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    var task: Task,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "actor_id", nullable = false)
    var actor: User,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "type", nullable = false, length = 30)
    var type: ActivityType,

    @Column(name = "from_value", length = 50)
    var fromValue: String?,

    @Column(name = "to_value", length = 50)
    var toValue: String?,

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,
) {
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is TaskActivity) return false
        val thisId = id
        return thisId != null && thisId == other.id
    }

    override fun hashCode(): Int = TaskActivity::class.java.hashCode()

    override fun toString(): String = "TaskActivity(id=$id, type=$type, $fromValue -> $toValue)"
}
