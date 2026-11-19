package com.taskflow.task

import com.taskflow.user.UserMapper
import org.springframework.stereotype.Component

/** Mapper pattern: the only place where [Task] entities are turned into DTOs. */
@Component
class TaskMapper(
    private val userMapper: UserMapper,
) {

    fun toDto(task: Task): TaskDto {
        val assignee = task.assignee
        return TaskDto(
            id = requireNotNull(task.id) { "Task must be persisted before mapping" },
            projectId = requireNotNull(task.project.id) { "Project must be persisted" },
            title = task.title,
            description = task.description,
            status = task.status,
            priority = task.priority,
            dueDate = task.dueDate,
            assigneeId = assignee?.id,
            assignee = assignee?.let(userMapper::toSummary),
            createdAt = requireNotNull(task.createdAt) { "Task must be persisted before mapping" },
            updatedAt = requireNotNull(task.updatedAt) { "Task must be persisted before mapping" },
        )
    }
}
