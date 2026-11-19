package com.taskflow.activity

import org.springframework.stereotype.Component

@Component
class TaskActivityMapper {

    fun toDto(activity: TaskActivity): TaskActivityDto = TaskActivityDto(
        id = requireNotNull(activity.id) { "Activity must be persisted before mapping" },
        taskId = requireNotNull(activity.task.id) { "Task must be persisted" },
        taskTitle = activity.task.title,
        type = activity.type,
        actorId = requireNotNull(activity.actor.id) { "Actor must be persisted" },
        actorName = activity.actor.name,
        fromValue = activity.fromValue,
        toValue = activity.toValue,
        createdAt = requireNotNull(activity.createdAt) { "Activity must be persisted before mapping" },
    )
}
