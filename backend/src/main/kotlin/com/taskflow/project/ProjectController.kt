package com.taskflow.project

import com.taskflow.security.UserPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/projects")
@Tag(name = "Projects")
class ProjectController(
    private val projectService: ProjectService,
) {

    @GetMapping
    @Operation(summary = "List the current user's projects")
    fun list(@AuthenticationPrincipal principal: UserPrincipal): List<ProjectDto> =
        projectService.listProjects(principal.id)

    @GetMapping("/{id}")
    @Operation(summary = "Get one of the current user's projects (404 if missing or not yours)")
    fun get(
        @AuthenticationPrincipal principal: UserPrincipal,
        @PathVariable id: UUID,
    ): ProjectDto = projectService.getProject(principal.id, id)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a project owned by the current user")
    fun create(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateProjectRequest,
    ): ProjectDto = projectService.createProject(principal.id, request)
}
