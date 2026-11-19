package com.taskflow.project

import com.taskflow.common.ResourceNotFoundException
import com.taskflow.user.UserRepository
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
    private val projectMapper: ProjectMapper,
) {

    /** Only the caller's own projects, newest first. */
    @Transactional(readOnly = true)
    fun listProjects(userId: UUID): List<ProjectDto> =
        projectRepository.findByOwnerIdOrderByCreatedAtDesc(userId).map(projectMapper::toDto)

    /** 404 if the project does not exist OR belongs to someone else. */
    @Transactional(readOnly = true)
    fun getProject(userId: UUID, projectId: UUID): ProjectDto {
        val project = projectRepository.findByIdAndOwnerId(projectId, userId)
            ?: throw ResourceNotFoundException("Project not found")
        return projectMapper.toDto(project)
    }

    @Transactional
    fun createProject(userId: UUID, request: CreateProjectRequest): ProjectDto {
        val owner = userRepository.findById(userId)
            .orElseThrow { BadCredentialsException("Account no longer exists") }
        val project = Project(
            name = request.name.trim(),
            description = request.description?.trim()?.takeIf { it.isNotEmpty() },
            owner = owner,
        )
        return projectMapper.toDto(projectRepository.save(project))
    }
}
