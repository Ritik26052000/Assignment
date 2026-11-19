package com.taskflow.auth

import com.taskflow.user.UserDto
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirements
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth")
@SecurityRequirements // public endpoints: no bearer token needed
class AuthController(
    private val authService: AuthService,
) {

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new user (409 if the email is already taken)")
    fun register(@Valid @RequestBody request: RegisterRequest): UserDto = authService.register(request)

    @PostMapping("/login")
    @Operation(summary = "Log in and receive a JWT")
    fun login(@Valid @RequestBody request: LoginRequest): AuthResponse = authService.login(request)
}
