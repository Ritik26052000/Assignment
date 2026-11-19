package com.taskflow.user

import com.taskflow.auth.ValidPassword
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CreateUserRequest(
    @field:NotBlank(message = "Name is required")
    @field:Size(min = 2, max = 80, message = "Name must be between 2 and 80 characters")
    @field:Schema(example = "Ada Lovelace")
    val name: String = "",

    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be a valid email address")
    @field:Size(max = 254, message = "Email must be at most 254 characters")
    @field:Schema(example = "ada@example.com")
    val email: String = "",

    @field:NotBlank(message = "Password is required")
    @field:ValidPassword
    @field:Schema(example = "Secret1234")
    val password: String = "",
)

data class UpdateUserRequest(
    @field:NotBlank(message = "Name is required")
    @field:Size(min = 2, max = 80, message = "Name must be between 2 and 80 characters")
    @field:Schema(example = "Ada Lovelace")
    val name: String = "",

    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be a valid email address")
    @field:Size(max = 254, message = "Email must be at most 254 characters")
    @field:Schema(example = "ada@example.com")
    val email: String = "",

    /** Optional. Leave blank to keep the current password. */
    @field:ValidPassword
    @field:Schema(example = "Secret1234", nullable = true)
    val password: String? = null,
)
