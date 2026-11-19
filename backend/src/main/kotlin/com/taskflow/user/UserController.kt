package com.taskflow.user

import com.taskflow.common.PageResponse
import com.taskflow.security.UserPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
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
@RequestMapping("/api/v1/users")
@Tag(name = "Users")
class UserController(
    private val userService: UserService,
) {

    @GetMapping("/me")
    @Operation(summary = "Current user (used to restore a session after a page refresh)")
    fun me(@AuthenticationPrincipal principal: UserPrincipal): UserDto =
        userService.getCurrentUser(principal.id)

    @GetMapping
    @Operation(summary = "List users with optional search and pagination")
    fun list(
        @Parameter(description = "Case-insensitive match on name or email")
        @RequestParam(required = false) search: String?,
        @Parameter(description = "0-based page index")
        @RequestParam(defaultValue = "0") page: Int,
        @Parameter(description = "Page size, 1-100")
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<UserDto> = userService.listUsers(search, page, size)

    @GetMapping("/{id}")
    @Operation(summary = "Get one user by id")
    fun get(@PathVariable id: UUID): UserDto = userService.getUser(id)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a user (409 if the email is already taken)")
    fun create(@Valid @RequestBody request: CreateUserRequest): UserDto =
        userService.createUser(request)

    @PutMapping("/{id}")
    @Operation(summary = "Update a user's name, email, and optionally password")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateUserRequest,
    ): UserDto = userService.updateUser(id, request)

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a user (blocked if they still own projects)")
    fun delete(@PathVariable id: UUID) {
        userService.deleteUser(id)
    }
}
