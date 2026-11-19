package com.taskflow.security

import com.fasterxml.jackson.databind.ObjectMapper
import com.taskflow.common.ApiError
import com.taskflow.common.ErrorCodes
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.stereotype.Component
import java.time.Clock

/** Unauthenticated access to a protected route: 401 in the standard [ApiError] JSON shape. */
@Component
class JwtAuthenticationEntryPoint(
    private val objectMapper: ObjectMapper,
    private val clock: Clock,
) : AuthenticationEntryPoint {

    override fun commence(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authException: AuthenticationException,
    ) {
        val message = request.getAttribute(JwtAuthFilter.AUTH_ERROR_ATTRIBUTE) as? String
            ?: "Authentication required"
        val body = ApiError.of(
            status = HttpStatus.UNAUTHORIZED,
            code = ErrorCodes.UNAUTHORIZED,
            message = message,
            path = request.requestURI,
            timestamp = clock.instant(),
        )
        response.status = HttpStatus.UNAUTHORIZED.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = Charsets.UTF_8.name()
        response.setHeader("WWW-Authenticate", "Bearer")
        objectMapper.writeValue(response.writer, body)
    }
}
