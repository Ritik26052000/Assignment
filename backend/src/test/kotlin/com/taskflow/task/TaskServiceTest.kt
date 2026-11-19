package com.taskflow.task

import com.taskflow.activity.ActivityType
import com.taskflow.activity.TaskActivity
import com.taskflow.activity.TaskActivityMapper
import com.taskflow.activity.TaskActivityRepository
import com.taskflow.common.BadRequestException
import com.taskflow.common.ResourceNotFoundException
import com.taskflow.project.Project
import com.taskflow.project.ProjectRepository
import com.taskflow.task.sort.DueDateSortStrategy
import com.taskflow.task.sort.PrioritySortStrategy
import com.taskflow.task.sort.TaskSortStrategyRegistry
import com.taskflow.user.User
import com.taskflow.user.UserMapper
import com.taskflow.user.UserRepository
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.Optional
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class TaskServiceTest {

    // "Today" is pinned so overdue and past-date maths are deterministic.
    private val now = Instant.parse("2026-11-18T10:00:00Z")
    private val clock = Clock.fixed(now, ZoneOffset.UTC)
    private val today = LocalDate.of(2026, 11, 18)

    private val taskRepository = mockk<TaskRepository>()
    private val projectRepository = mockk<ProjectRepository>()
    private val userRepository = mockk<UserRepository>()
    private val activityRepository = mockk<TaskActivityRepository>()

    private val service = TaskService(
        taskRepository = taskRepository,
        projectRepository = projectRepository,
        userRepository = userRepository,
        activityRepository = activityRepository,
        taskMapper = TaskMapper(UserMapper()),
        activityMapper = TaskActivityMapper(),
        sortRegistry = TaskSortStrategyRegistry(listOf(DueDateSortStrategy(), PrioritySortStrategy())),
        clock = clock,
    )

    private val userId = UUID.randomUUID()
    private val user = User("Owner", "owner@example.com", "hash", userId).apply { createdAt = now }
    private val project = Project("Alpha", null, user, UUID.randomUUID()).apply { createdAt = now }

    private fun task(
        status: TaskStatus = TaskStatus.TODO,
        dueDate: LocalDate? = null,
        assignee: User? = null,
    ) = Task(
        title = "Existing task",
        description = null,
        status = status,
        priority = TaskPriority.MEDIUM,
        dueDate = dueDate,
        project = project,
        assignee = assignee,
        id = UUID.randomUUID(),
    ).apply {
        createdAt = now
        updatedAt = now
    }

    private fun createRequest(title: String = "New task", dueDate: LocalDate? = null, assigneeId: UUID? = null) =
        CreateTaskRequest(title = title, dueDate = dueDate, assigneeId = assigneeId)

    private fun updateRequest(title: String = "Edited", dueDate: LocalDate? = null, status: TaskStatus? = null) =
        UpdateTaskRequest(title = title, dueDate = dueDate, status = status)

    private fun stubSaveAssigningIds() {
        every { taskRepository.save(any<Task>()) } answers {
            firstArg<Task>().apply {
                id = UUID.randomUUID()
                createdAt = now
                updatedAt = now
            }
        }
    }

    private fun stubSaveAndFlushReturningArgument() {
        every { taskRepository.saveAndFlush(any<Task>()) } answers { firstArg<Task>() }
    }

    private fun statusCount(taskStatus: TaskStatus, count: Long) = object : StatusCount {
        override val status = taskStatus
        override val total = count
    }

    // ---- create ------------------------------------------------------------------------------

    @Test
    fun `create applies defaults and trims the title`() {
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns project
        stubSaveAssigningIds()

        val dto = service.createTask(userId, project.id!!, createRequest(title = "  Write docs  "))

        assertEquals("Write docs", dto.title)
        assertEquals(TaskStatus.TODO, dto.status)
        assertEquals(TaskPriority.MEDIUM, dto.priority)
        assertNull(dto.assignee)
        assertEquals(project.id, dto.projectId)
    }

    @Test
    fun `create rejects a due date in the past with a field error`() {
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns project

        val ex = assertThrows<BadRequestException> {
            service.createTask(userId, project.id!!, createRequest(dueDate = today.minusDays(1)))
        }

        assertEquals("dueDate", ex.fieldErrors.single().field)
        verify(exactly = 0) { taskRepository.save(any<Task>()) }
    }

    @Test
    fun `create accepts today as a due date`() {
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns project
        stubSaveAssigningIds()

        val dto = service.createTask(userId, project.id!!, createRequest(dueDate = today))

        assertEquals(today, dto.dueDate)
    }

    @Test
    fun `create rejects an assignee that does not exist`() {
        val missing = UUID.randomUUID()
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns project
        every { userRepository.findById(missing) } returns Optional.empty()

        val ex = assertThrows<BadRequestException> {
            service.createTask(userId, project.id!!, createRequest(assigneeId = missing))
        }

        assertEquals("assigneeId", ex.fieldErrors.single().field)
    }

    @Test
    fun `create in someone else's project is not found`() {
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns null

        assertThrows<ResourceNotFoundException> {
            service.createTask(userId, project.id!!, createRequest())
        }
        verify(exactly = 0) { taskRepository.save(any<Task>()) }
    }

    // ---- update ------------------------------------------------------------------------------

    @Test
    fun `update allows keeping an already past due date unchanged`() {
        val overdueDate = today.minusDays(5)
        val existing = task(dueDate = overdueDate)
        every { taskRepository.findByIdAndOwnerId(existing.id!!, userId) } returns existing
        stubSaveAndFlushReturningArgument()

        val dto = service.updateTask(userId, existing.id!!, updateRequest(title = "Renamed", dueDate = overdueDate))

        assertEquals("Renamed", dto.title)
        assertEquals(overdueDate, dto.dueDate)
    }

    @Test
    fun `update rejects changing the due date to a past date`() {
        val existing = task(dueDate = today.plusDays(3))
        every { taskRepository.findByIdAndOwnerId(existing.id!!, userId) } returns existing

        val ex = assertThrows<BadRequestException> {
            service.updateTask(userId, existing.id!!, updateRequest(dueDate = today.minusDays(1)))
        }

        assertEquals("dueDate", ex.fieldErrors.single().field)
        verify(exactly = 0) { taskRepository.saveAndFlush(any<Task>()) }
    }

    @Test
    fun `update can clear the due date and the assignee`() {
        val existing = task(dueDate = today.plusDays(2), assignee = user)
        every { taskRepository.findByIdAndOwnerId(existing.id!!, userId) } returns existing
        stubSaveAndFlushReturningArgument()

        val dto = service.updateTask(userId, existing.id!!, updateRequest())

        assertNull(dto.dueDate)
        assertNull(dto.assignee)
        assertNull(dto.assigneeId)
    }

    @Test
    fun `update that changes the status goes through the same activity path`() {
        val existing = task(status = TaskStatus.TODO)
        val activity = slot<TaskActivity>()
        every { taskRepository.findByIdAndOwnerId(existing.id!!, userId) } returns existing
        every { userRepository.getReferenceById(userId) } returns user
        every { activityRepository.save(capture(activity)) } answers { activity.captured }
        stubSaveAndFlushReturningArgument()

        val dto = service.updateTask(userId, existing.id!!, updateRequest(status = TaskStatus.DONE))

        assertEquals(TaskStatus.DONE, dto.status)
        assertEquals("TODO", activity.captured.fromValue)
        assertEquals("DONE", activity.captured.toValue)
    }

    // ---- status ------------------------------------------------------------------------------

    @Test
    fun `changing status records who changed what`() {
        val existing = task(status = TaskStatus.TODO)
        val activity = slot<TaskActivity>()
        every { taskRepository.findByIdAndOwnerId(existing.id!!, userId) } returns existing
        every { userRepository.getReferenceById(userId) } returns user
        every { activityRepository.save(capture(activity)) } answers { activity.captured }
        stubSaveAndFlushReturningArgument()

        val dto = service.changeStatus(userId, existing.id!!, TaskStatus.IN_PROGRESS)

        assertEquals(TaskStatus.IN_PROGRESS, dto.status)
        assertEquals(ActivityType.STATUS_CHANGED, activity.captured.type)
        assertEquals("TODO", activity.captured.fromValue)
        assertEquals("IN_PROGRESS", activity.captured.toValue)
        assertEquals(user, activity.captured.actor)
        assertEquals(existing, activity.captured.task)
    }

    @Test
    fun `changing to the same status is a no-op and writes no activity`() {
        val existing = task(status = TaskStatus.DONE)
        every { taskRepository.findByIdAndOwnerId(existing.id!!, userId) } returns existing
        stubSaveAndFlushReturningArgument()

        val dto = service.changeStatus(userId, existing.id!!, TaskStatus.DONE)

        assertEquals(TaskStatus.DONE, dto.status)
        verify(exactly = 0) { activityRepository.save(any<TaskActivity>()) }
    }

    @Test
    fun `changing the status of a task in someone else's project is not found`() {
        val taskId = UUID.randomUUID()
        every { taskRepository.findByIdAndOwnerId(taskId, userId) } returns null

        assertThrows<ResourceNotFoundException> { service.changeStatus(userId, taskId, TaskStatus.DONE) }
        verify(exactly = 0) { activityRepository.save(any<TaskActivity>()) }
    }

    // ---- delete ------------------------------------------------------------------------------

    @Test
    fun `delete removes the task and its activity`() {
        val existing = task()
        every { taskRepository.findByIdAndOwnerId(existing.id!!, userId) } returns existing
        every { activityRepository.deleteByTaskId(existing.id!!) } just runs
        every { taskRepository.delete(existing) } just runs

        service.deleteTask(userId, existing.id!!)

        verify(exactly = 1) { activityRepository.deleteByTaskId(existing.id!!) }
        verify(exactly = 1) { taskRepository.delete(existing) }
    }

    @Test
    fun `deleting a task that is gone (or not yours) is not found`() {
        val taskId = UUID.randomUUID()
        every { taskRepository.findByIdAndOwnerId(taskId, userId) } returns null

        assertThrows<ResourceNotFoundException> { service.deleteTask(userId, taskId) }
        verify(exactly = 0) { taskRepository.delete(any<Task>()) }
    }

    // ---- summary -----------------------------------------------------------------------------

    @Test
    fun `summary zero-fills missing statuses and reports overdue measured against the fixed clock`() {
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns project
        every { taskRepository.countByStatus(project.id!!) } returns listOf(
            statusCount(TaskStatus.TODO, 3),
            statusCount(TaskStatus.DONE, 2),
        )
        every {
            taskRepository.countByProjectIdAndDueDateBeforeAndStatusNot(project.id!!, today, TaskStatus.DONE)
        } returns 2

        val summary = service.getSummary(userId, project.id!!)

        assertEquals(3L, summary.byStatus[TaskStatus.TODO])
        assertEquals(0L, summary.byStatus[TaskStatus.IN_PROGRESS])
        assertEquals(2L, summary.byStatus[TaskStatus.DONE])
        assertEquals(5L, summary.total)
        assertEquals(2L, summary.overdue)
    }

    @Test
    fun `summary of an empty project is all zeros`() {
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns project
        every { taskRepository.countByStatus(project.id!!) } returns emptyList()
        every {
            taskRepository.countByProjectIdAndDueDateBeforeAndStatusNot(project.id!!, today, TaskStatus.DONE)
        } returns 0

        val summary = service.getSummary(userId, project.id!!)

        assertEquals(TaskStatus.entries.toSet(), summary.byStatus.keys)
        assertEquals(0L, summary.total)
        assertEquals(0L, summary.overdue)
    }

    @Test
    fun `summary of someone else's project is not found`() {
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns null

        assertThrows<ResourceNotFoundException> { service.getSummary(userId, project.id!!) }
    }

    // ---- activity ----------------------------------------------------------------------------

    @Test
    fun `activity of a task that is not yours is not found`() {
        val taskId = UUID.randomUUID()
        every { taskRepository.findByIdAndOwnerId(taskId, userId) } returns null

        assertThrows<ResourceNotFoundException> { service.getActivity(userId, taskId) }
        verify(exactly = 0) { activityRepository.findByTaskId(any()) }
    }

    @Test
    fun `activity maps rows to DTOs`() {
        val existing = task()
        val activity = TaskActivity(
            task = existing,
            actor = user,
            type = ActivityType.STATUS_CHANGED,
            fromValue = "TODO",
            toValue = "DONE",
            id = UUID.randomUUID(),
        ).apply { createdAt = now }
        every { taskRepository.findByIdAndOwnerId(existing.id!!, userId) } returns existing
        every { activityRepository.findByTaskId(existing.id!!) } returns listOf(activity)

        val result = service.getActivity(userId, existing.id!!)

        val dto = assertNotNull(result.singleOrNull())
        assertEquals("Owner", dto.actorName)
        assertEquals(existing.title, dto.taskTitle)
        assertEquals("DONE", dto.toValue)
    }

    @Test
    fun `project activity of a project that is not yours is not found`() {
        val projectId = UUID.randomUUID()
        every { projectRepository.findByIdAndOwnerId(projectId, userId) } returns null

        assertThrows<ResourceNotFoundException> { service.getProjectActivity(userId, projectId, 40) }
        verify(exactly = 0) { activityRepository.findRecentByProjectId(any(), any()) }
    }

    @Test
    fun `project activity maps rows to DTOs with a capped limit`() {
        val existing = task()
        val activity = TaskActivity(
            task = existing,
            actor = user,
            type = ActivityType.STATUS_CHANGED,
            fromValue = "TODO",
            toValue = "IN_PROGRESS",
            id = UUID.randomUUID(),
        ).apply { createdAt = now }
        every { projectRepository.findByIdAndOwnerId(project.id!!, userId) } returns project
        every { activityRepository.findRecentByProjectId(project.id!!, any()) } returns listOf(activity)

        val result = service.getProjectActivity(userId, project.id!!, 40)

        val dto = assertNotNull(result.singleOrNull())
        assertEquals(existing.title, dto.taskTitle)
        assertEquals("IN_PROGRESS", dto.toValue)
        verify(exactly = 1) { activityRepository.findRecentByProjectId(project.id!!, any()) }
    }
}
