package com.taskflow.security

import com.fasterxml.jackson.databind.ObjectMapper
import com.taskflow.common.ApiError
import com.taskflow.common.ErrorCodes
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component
import java.time.Clock

/** Authenticated but not allowed: 403 in the standard [ApiError] JSON shape. */
@Component
class JwtAccessDeniedHandler(
    private val objectMapper: ObjectMapper,
    private val clock: Clock,
) : AccessDeniedHandler {

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException,
    ) {
        val body = ApiError.of(
            status = HttpStatus.FORBIDDEN,
            code = ErrorCodes.FORBIDDEN,
            message = "Access denied",
            path = request.requestURI,
            timestamp = clock.instant(),
        )
        response.status = HttpStatus.FORBIDDEN.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = Charsets.UTF_8.name()
        objectMapper.writeValue(response.writer, body)
    }
}
