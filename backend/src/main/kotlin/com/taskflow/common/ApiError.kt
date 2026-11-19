package com.taskflow.common

import io.swagger.v3.oas.annotations.media.Schema
import org.springframework.http.HttpStatus
import java.time.Instant

@Schema(description = "A single field-level validation problem")
data class ApiFieldError(
    val field: String,
    val message: String,
)

/**
 * The one error shape returned by every failing request (validation, auth, not found, server errors).
 */
@Schema(description = "Standard error response")
data class ApiError(
    val timestamp: Instant,
    val status: Int,
    val error: String,
    val code: String,
    val message: String,
    val path: String,
    val fieldErrors: List<ApiFieldError> = emptyList(),
) {
    companion object {
        /** Factory used by the exception handler and by the security entry point / denied handler. */
        fun of(
            status: HttpStatus,
            code: String,
            message: String,
            path: String,
            timestamp: Instant,
            fieldErrors: List<ApiFieldError> = emptyList(),
        ): ApiError = ApiError(
            timestamp = timestamp,
            status = status.value(),
            error = status.reasonPhrase,
            code = code,
            message = message,
            path = path,
            fieldErrors = fieldErrors,
        )
    }
}

/** Stable machine-readable error codes. */
object ErrorCodes {
    const val VALIDATION_FAILED = "VALIDATION_FAILED"
    const val MALFORMED_REQUEST = "MALFORMED_REQUEST"
    const val INVALID_PARAMETER = "INVALID_PARAMETER"
    const val BAD_REQUEST = "BAD_REQUEST"
    const val NOT_FOUND = "NOT_FOUND"
    const val EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    const val CONFLICT = "CONFLICT"
    const val INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    const val UNAUTHORIZED = "UNAUTHORIZED"
    const val FORBIDDEN = "FORBIDDEN"
    const val INTERNAL_ERROR = "INTERNAL_ERROR"
}
