package com.taskflow.project

import org.springframework.stereotype.Component

/** Mapper pattern: the only place where [Project] entities are turned into DTOs. */
@Component
class ProjectMapper {

    fun toDto(project: Project): ProjectDto = ProjectDto(
        id = requireNotNull(project.id) { "Project must be persisted before mapping" },
        name = project.name,
        description = project.description,
        // `owner` is a lazy reference; reading its id does not need the user row.
        ownerId = requireNotNull(project.owner.id) { "Project owner must be persisted" },
        createdAt = requireNotNull(project.createdAt) { "Project must be persisted before mapping" },
    )
}
