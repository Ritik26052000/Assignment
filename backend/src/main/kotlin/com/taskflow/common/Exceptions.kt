package com.taskflow.common

/** Resource does not exist, or exists but belongs to someone else (deliberately indistinguishable). */
class ResourceNotFoundException(message: String) : RuntimeException(message)

/** Registration attempted with an email that is already taken. */
class DuplicateEmailException(message: String = "Email is already registered") : RuntimeException(message)

/** Business-rule violation that maps to HTTP 400, optionally with field-level details. */
class BadRequestException(
    message: String,
    val code: String = ErrorCodes.BAD_REQUEST,
    val fieldErrors: List<ApiFieldError> = emptyList(),
) : RuntimeException(message) {
    companion object {
        /** A validation failure attached to a single request field. */
        fun field(field: String, message: String): BadRequestException = BadRequestException(
            message = "Validation failed",
            code = ErrorCodes.VALIDATION_FAILED,
            fieldErrors = listOf(ApiFieldError(field, message)),
        )
    }
}
