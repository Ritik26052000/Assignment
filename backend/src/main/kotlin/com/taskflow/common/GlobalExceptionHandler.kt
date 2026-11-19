package com.taskflow.common

import com.fasterxml.jackson.databind.exc.InvalidFormatException
import com.fasterxml.jackson.databind.exc.MismatchedInputException
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.beans.TypeMismatchException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.core.AuthenticationException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.ServletWebRequest
import org.springframework.web.context.request.WebRequest
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler
import java.time.Clock

/**
 * Translates every failure into the single [ApiError] shape.
 *
 * Extends [ResponseEntityExceptionHandler] so that Spring's own MVC exceptions (405, 415, unknown
 * route, missing parameter, ...) are also rendered as [ApiError] instead of falling into the
 * catch-all 500 handler.
 */
@RestControllerAdvice
class GlobalExceptionHandler(private val clock: Clock) : ResponseEntityExceptionHandler() {

    private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    // ---- Our own exceptions ------------------------------------------------------------------

    @ExceptionHandler(ResourceNotFoundException::class)
    fun handleNotFound(ex: ResourceNotFoundException, request: HttpServletRequest): ResponseEntity<Any> =
        build(HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND, ex.message ?: "Resource not found", request.requestURI)

    @ExceptionHandler(DuplicateEmailException::class)
    fun handleDuplicateEmail(ex: DuplicateEmailException, request: HttpServletRequest): ResponseEntity<Any> =
        build(
            HttpStatus.CONFLICT,
            ErrorCodes.EMAIL_ALREADY_EXISTS,
            ex.message ?: "Email is already registered",
            request.requestURI,
            listOf(ApiFieldError("email", ex.message ?: "Email is already registered")),
        )

    @ExceptionHandler(BadRequestException::class)
    fun handleBadRequest(ex: BadRequestException, request: HttpServletRequest): ResponseEntity<Any> =
        build(HttpStatus.BAD_REQUEST, ex.code, ex.message ?: "Bad request", request.requestURI, ex.fieldErrors)

    // ---- Validation / binding ----------------------------------------------------------------

    override fun handleMethodArgumentNotValid(
        ex: MethodArgumentNotValidException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        val fieldErrors = ex.bindingResult.fieldErrors
            .map { ApiFieldError(it.field, it.defaultMessage ?: "Invalid value") }
            .sortedBy { it.field }
        val globalErrors = ex.bindingResult.globalErrors
            .map { ApiFieldError(it.objectName, it.defaultMessage ?: "Invalid value") }
        return build(
            HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED, "Validation failed",
            pathOf(request), fieldErrors + globalErrors,
        )
    }

    override fun handleHandlerMethodValidationException(
        ex: HandlerMethodValidationException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        val fieldErrors = ex.allValidationResults.flatMap { result ->
            val name = result.methodParameter.parameterName ?: "parameter"
            result.resolvableErrors.map { ApiFieldError(name, it.defaultMessage ?: "Invalid value") }
        }
        return build(
            HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED, "Validation failed",
            pathOf(request), fieldErrors,
        )
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException, request: HttpServletRequest): ResponseEntity<Any> {
        val fieldErrors = ex.constraintViolations
            .map { ApiFieldError(it.propertyPath.toString().substringAfterLast('.'), it.message) }
            .sortedBy { it.field }
        return build(
            HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_FAILED, "Validation failed",
            request.requestURI, fieldErrors,
        )
    }

    override fun handleHttpMessageNotReadable(
        ex: HttpMessageNotReadableException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        var message = "Malformed JSON request body"
        var fieldErrors = emptyList<ApiFieldError>()

        when (val cause = ex.cause) {
            is InvalidFormatException -> {
                val field = jsonPath(cause)
                val allowed = cause.targetType
                    ?.takeIf { it.isEnum }
                    ?.enumConstants
                    ?.joinToString(", ")
                message = buildString {
                    append("Invalid value '${cause.value}'")
                    if (field.isNotEmpty()) append(" for field '$field'")
                    if (allowed != null) append(". Allowed values: $allowed")
                }
                if (field.isNotEmpty()) fieldErrors = listOf(ApiFieldError(field, message))
            }

            is MismatchedInputException -> {
                val field = jsonPath(cause)
                message = if (field.isNotEmpty()) "Invalid or missing value for field '$field'" else message
                if (field.isNotEmpty()) fieldErrors = listOf(ApiFieldError(field, message))
            }
        }
        return build(HttpStatus.BAD_REQUEST, ErrorCodes.MALFORMED_REQUEST, message, pathOf(request), fieldErrors)
    }

    override fun handleTypeMismatch(
        ex: TypeMismatchException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        val name = (ex as? MethodArgumentTypeMismatchException)?.name ?: ex.propertyName ?: "parameter"
        val allowed = ex.requiredType?.takeIf { it.isEnum }?.enumConstants?.joinToString(", ")
        val message = buildString {
            append("Invalid value '${ex.value}' for parameter '$name'")
            if (allowed != null) append(". Allowed values: $allowed")
        }
        return build(
            HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_PARAMETER, message,
            pathOf(request), listOf(ApiFieldError(name, message)),
        )
    }

    // ---- Persistence -------------------------------------------------------------------------

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun handleDataIntegrity(ex: DataIntegrityViolationException, request: HttpServletRequest): ResponseEntity<Any> {
        log.warn("Data integrity violation on {}: {}", request.requestURI, ex.mostSpecificCause.message)
        return build(
            HttpStatus.CONFLICT, ErrorCodes.CONFLICT,
            "The request conflicts with existing data", request.requestURI,
        )
    }

    // ---- Security ----------------------------------------------------------------------------

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentials(ex: BadCredentialsException, request: HttpServletRequest): ResponseEntity<Any> =
        build(
            HttpStatus.UNAUTHORIZED, ErrorCodes.INVALID_CREDENTIALS,
            ex.message ?: "Invalid email or password", request.requestURI,
        )

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthentication(ex: AuthenticationException, request: HttpServletRequest): ResponseEntity<Any> =
        build(HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED, "Authentication required", request.requestURI)

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(ex: AccessDeniedException, request: HttpServletRequest): ResponseEntity<Any> =
        build(HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN, "Access denied", request.requestURI)

    // ---- Everything else ---------------------------------------------------------------------

    /** Spring MVC's own exceptions (405, 415, 404 for unknown routes, missing params...). */
    override fun handleExceptionInternal(
        ex: Exception,
        body: Any?,
        headers: HttpHeaders,
        statusCode: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any> {
        val status = HttpStatus.resolve(statusCode.value()) ?: HttpStatus.INTERNAL_SERVER_ERROR
        if (status.is5xxServerError) {
            log.error("Unhandled MVC exception on {}", pathOf(request), ex)
        }
        val message = when {
            status.is5xxServerError -> "An unexpected error occurred"
            body is ProblemDetail && !body.detail.isNullOrBlank() -> body.detail!!
            else -> status.reasonPhrase
        }
        return build(status, codeFor(status), message, pathOf(request), emptyList(), headers)
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<Any> {
        // Full details only in the logs, never in the response.
        log.error("Unexpected error on {} {}", request.method, request.requestURI, ex)
        return build(
            HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR,
            "An unexpected error occurred", request.requestURI,
        )
    }

    // ---- helpers -----------------------------------------------------------------------------

    private fun build(
        status: HttpStatus,
        code: String,
        message: String,
        path: String,
        fieldErrors: List<ApiFieldError> = emptyList(),
        headers: HttpHeaders = HttpHeaders(),
    ): ResponseEntity<Any> {
        val body = ApiError.of(status, code, message, path, clock.instant(), fieldErrors)
        return ResponseEntity.status(status).headers(headers).body(body)
    }

    private fun pathOf(request: WebRequest): String =
        (request as? ServletWebRequest)?.request?.requestURI ?: ""

    private fun jsonPath(ex: com.fasterxml.jackson.databind.JsonMappingException): String =
        ex.path.joinToString(".") { it.fieldName ?: "[${it.index}]" }.replace(".[", "[")

    private fun codeFor(status: HttpStatus): String = when (status) {
        HttpStatus.BAD_REQUEST -> ErrorCodes.BAD_REQUEST
        HttpStatus.NOT_FOUND -> ErrorCodes.NOT_FOUND
        HttpStatus.METHOD_NOT_ALLOWED -> "METHOD_NOT_ALLOWED"
        HttpStatus.NOT_ACCEPTABLE -> "NOT_ACCEPTABLE"
        HttpStatus.UNSUPPORTED_MEDIA_TYPE -> "UNSUPPORTED_MEDIA_TYPE"
        HttpStatus.UNAUTHORIZED -> ErrorCodes.UNAUTHORIZED
        HttpStatus.FORBIDDEN -> ErrorCodes.FORBIDDEN
        HttpStatus.CONFLICT -> ErrorCodes.CONFLICT
        else -> if (status.is5xxServerError) ErrorCodes.INTERNAL_ERROR else status.name
    }
}
