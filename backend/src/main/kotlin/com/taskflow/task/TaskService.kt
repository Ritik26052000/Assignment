package com.taskflow.task

import com.taskflow.activity.ActivityType
import com.taskflow.activity.TaskActivity
import com.taskflow.activity.TaskActivityDto
import com.taskflow.activity.TaskActivityMapper
import com.taskflow.activity.TaskActivityRepository
import com.taskflow.common.BadRequestException
import com.taskflow.common.PageResponse
import com.taskflow.common.ResourceNotFoundException
import com.taskflow.project.Project
import com.taskflow.project.ProjectRepository
import com.taskflow.task.sort.TaskSortStrategyRegistry
import com.taskflow.task.spec.TaskFilter
import com.taskflow.task.spec.TaskSpecifications
import com.taskflow.user.User
import com.taskflow.user.UserRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.util.EnumMap
import java.util.UUID

/**
 * All task business rules. Every method is scoped to the calling user: projects and tasks are looked
 * up through their owner, so anything that belongs to someone else is reported as "not found".
 */
@Service
class TaskService(
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
    private val activityRepository: TaskActivityRepository,
    private val taskMapper: TaskMapper,
    private val activityMapper: TaskActivityMapper,
    private val sortRegistry: TaskSortStrategyRegistry,
    private val clock: Clock,
) {

    // ---- Queries -----------------------------------------------------------------------------

    @Transactional(readOnly = true)
    fun listTasks(
        userId: UUID,
        projectId: UUID,
        filter: TaskFilter,
        sort: String?,
        page: Int,
        size: Int,
    ): PageResponse<TaskDto> {
        requireOwnedProject(userId, projectId)

        val taskSort = sortRegistry.parse(sort)
        val specification: Specification<Task> = TaskSpecifications.forProject(projectId, filter)
            .and(TaskSpecifications.sortedBy(taskSort.strategy, taskSort.direction))
        val pageable = PageRequest.of(page.coerceAtLeast(0), size.coerceIn(1, MAX_PAGE_SIZE))

        return PageResponse.from(taskRepository.findAll(specification, pageable), taskMapper::toDto)
    }

    @Transactional(readOnly = true)
    fun getSummary(userId: UUID, projectId: UUID): ProjectSummaryDto {
        requireOwnedProject(userId, projectId)

        val counts = EnumMap<TaskStatus, Long>(TaskStatus::class.java)
        TaskStatus.entries.forEach { counts[it] = 0L } // zero-fill so the UI never has to guess
        taskRepository.countByStatus(projectId).forEach { counts[it.status] = it.total }

        val today = LocalDate.now(clock)
        val overdue = taskRepository.countByProjectIdAndDueDateBeforeAndStatusNot(projectId, today, TaskStatus.DONE)

        return ProjectSummaryDto(
            projectId = projectId,
            total = counts.values.sum(),
            overdue = overdue,
            byStatus = counts,
        )
    }

    @Transactional(readOnly = true)
    fun getActivity(userId: UUID, taskId: UUID): List<TaskActivityDto> {
        requireOwnedTask(userId, taskId)
        return activityRepository.findByTaskId(taskId).map(activityMapper::toDto)
    }

    @Transactional(readOnly = true)
    fun getProjectActivity(userId: UUID, projectId: UUID, limit: Int): List<TaskActivityDto> {
        requireOwnedProject(userId, projectId)
        val size = limit.coerceIn(1, MAX_PAGE_SIZE)
        return activityRepository
            .findRecentByProjectId(projectId, PageRequest.of(0, size))
            .map(activityMapper::toDto)
    }

    // ---- Commands ----------------------------------------------------------------------------

    @Transactional
    fun createTask(userId: UUID, projectId: UUID, request: CreateTaskRequest): TaskDto {
        val project = requireOwnedProject(userId, projectId)

        request.dueDate?.let { dueDate ->
            if (dueDate.isBefore(LocalDate.now(clock))) throw dueDateInPast()
        }
        val assignee = resolveAssignee(request.assigneeId)

        val task = Task(
            title = request.title.trim(),
            description = cleanDescription(request.description),
            status = request.status ?: TaskStatus.TODO,
            priority = request.priority ?: TaskPriority.MEDIUM,
            dueDate = request.dueDate,
            project = project,
            assignee = assignee,
        )
        return taskMapper.toDto(taskRepository.save(task))
    }

    @Transactional
    fun updateTask(userId: UUID, taskId: UUID, request: UpdateTaskRequest): TaskDto {
        val task = requireOwnedTask(userId, taskId)

        // Only a CHANGE to a past date is rejected, so editing an already-overdue task still works.
        val newDueDate = request.dueDate
        if (newDueDate != null && newDueDate != task.dueDate && newDueDate.isBefore(LocalDate.now(clock))) {
            throw dueDateInPast()
        }

        if (request.assigneeId != task.assignee?.id) {
            task.assignee = resolveAssignee(request.assigneeId)
        }
        task.title = request.title.trim()
        task.description = cleanDescription(request.description)
        task.priority = request.priority ?: task.priority
        task.dueDate = newDueDate
        request.status?.let { applyStatus(task, it, userId) }

        // Flush so @LastModifiedDate is populated before the entity is mapped to a DTO.
        return taskMapper.toDto(taskRepository.saveAndFlush(task))
    }

    @Transactional
    fun changeStatus(userId: UUID, taskId: UUID, status: TaskStatus): TaskDto {
        val task = requireOwnedTask(userId, taskId)
        applyStatus(task, status, userId)
        return taskMapper.toDto(taskRepository.saveAndFlush(task))
    }

    @Transactional
    fun deleteTask(userId: UUID, taskId: UUID) {
        val task = requireOwnedTask(userId, taskId)
        activityRepository.deleteByTaskId(taskId)
        taskRepository.delete(task)
    }

    // ---- Helpers -----------------------------------------------------------------------------

    /** The single status-change path shared by PUT and PATCH. A no-op writes no activity row. */
    private fun applyStatus(task: Task, newStatus: TaskStatus, actorId: UUID) {
        val oldStatus = task.status
        if (oldStatus == newStatus) return

        activityRepository.save(
            TaskActivity(
                task = task,
                actor = userRepository.getReferenceById(actorId),
                type = ActivityType.STATUS_CHANGED,
                fromValue = oldStatus.name,
                toValue = newStatus.name,
            ),
        )
        task.status = newStatus
    }

    private fun requireOwnedProject(userId: UUID, projectId: UUID): Project =
        projectRepository.findByIdAndOwnerId(projectId, userId)
            ?: throw ResourceNotFoundException("Project not found")

    private fun requireOwnedTask(userId: UUID, taskId: UUID): Task =
        taskRepository.findByIdAndOwnerId(taskId, userId)
            ?: throw ResourceNotFoundException("Task not found")

    private fun resolveAssignee(assigneeId: UUID?): User? {
        if (assigneeId == null) return null
        return userRepository.findById(assigneeId).orElseThrow {
            BadRequestException.field("assigneeId", "Assignee does not exist")
        }
    }

    private fun cleanDescription(description: String?): String? =
        description?.trim()?.takeIf { it.isNotEmpty() }

    private fun dueDateInPast() = BadRequestException.field("dueDate", "Due date cannot be in the past")

    companion object {
        const val MAX_PAGE_SIZE = 100
    }
}
