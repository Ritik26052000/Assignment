package com.taskflow.auth

import com.taskflow.user.UserDto
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

// Request fields default to "" so a missing field produces a clean field-level validation message
// instead of a JSON mapping error.

data class RegisterRequest(
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

data class LoginRequest(
    @field:NotBlank(message = "Email is required")
    @field:Size(max = 254, message = "Email must be at most 254 characters")
    @field:Schema(example = "demo@taskflow.com")
    val email: String = "",

    @field:NotBlank(message = "Password is required")
    @field:Size(max = 128, message = "Password must be at most 128 characters")
    @field:Schema(example = "Demo1234")
    val password: String = "",
)

data class AuthResponse(
    val token: String,
    val tokenType: String = "Bearer",
    @field:Schema(description = "Token lifetime in seconds")
    val expiresIn: Long,
    val user: UserDto,
)
