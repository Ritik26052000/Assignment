package com.taskflow.task

import com.taskflow.activity.TaskActivityDto
import com.taskflow.common.PageResponse
import com.taskflow.security.UserPrincipal
import com.taskflow.task.spec.AssigneeFilter
import com.taskflow.task.spec.TaskFilter
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Tasks")
class TaskController(
    private val taskService: TaskService,
) {

    @GetMapping("/projects/{projectId}/tasks")
    @Operation(summary = "List a project's tasks with filters, sorting and pagination")
    fun list(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable projectId: UUID,
        @RequestParam(required = false) status: TaskStatus?,
        @RequestParam(required = false) priority: TaskPriority?,
        @Parameter(description = "A user id, or the literal 'unassigned'")
        @RequestParam(required = false) assigneeId: String?,
        @Parameter(description = "<key>,<asc|desc> where key is dueDate or priority. Default: dueDate,asc", example = "dueDate,asc")
        @RequestParam(required = false) sort: String?,
        @Parameter(description = "0-based page index")
        @RequestParam(defaultValue = "0") page: Int,
        @Parameter(description = "Page size, 1-100")
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<TaskDto> = taskService.listTasks(
        userId = principal.id,
        projectId = projectId,
        filter = TaskFilter(status, priority, AssigneeFilter.parse(assigneeId)),
        sort = sort,
        page = page,
        size = size,
    )

    @PostMapping("/projects/{projectId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a task in a project")
    fun create(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable projectId: UUID,
        @Valid @RequestBody request: CreateTaskRequest,
    ): TaskDto = taskService.createTask(principal.id, projectId, request)

    @GetMapping("/projects/{projectId}/summary")
    @Operation(summary = "Task counts per status plus the number of overdue tasks")
    fun summary(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable projectId: UUID,
    ): ProjectSummaryDto = taskService.getSummary(principal.id, projectId)

    @GetMapping("/projects/{projectId}/activity")
    @Operation(summary = "Recent status-change activity across a project, newest first")
    fun projectActivity(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable projectId: UUID,
        @Parameter(description = "Max rows to return, 1-100")
        @RequestParam(defaultValue = "40") limit: Int,
    ): List<TaskActivityDto> = taskService.getProjectActivity(principal.id, projectId, limit)

    @PutMapping("/tasks/{id}")
    @Operation(summary = "Update a task")
    fun update(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateTaskRequest,
    ): TaskDto = taskService.updateTask(principal.id, id, request)

    @PatchMapping("/tasks/{id}/status")
    @Operation(summary = "Change only the status of a task")
    fun updateStatus(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateTaskStatusRequest,
    ): TaskDto = taskService.changeStatus(principal.id, id, requireNotNull(request.status))

    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a task (a second delete returns 404)")
    fun delete(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable id: UUID,
    ) {
        taskService.deleteTask(principal.id, id)
    }

    @GetMapping("/tasks/{id}/activity")
    @Operation(summary = "Status-change history of a task, newest first")
    fun activity(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable id: UUID,
    ): List<TaskActivityDto> = taskService.getActivity(principal.id, id)
}
