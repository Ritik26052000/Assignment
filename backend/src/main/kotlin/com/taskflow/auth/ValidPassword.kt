package com.taskflow.auth

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

/**
 * Password policy: 8 to 72 bytes (UTF-8; BCrypt ignores everything past 72 bytes) with at least
 * one letter and one digit. Blank values are left to `@NotBlank`.
 */
@Target(AnnotationTarget.FIELD, AnnotationTarget.PROPERTY_GETTER, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [PasswordValidator::class])
annotation class ValidPassword(
    val message: String = "Password must be 8-72 bytes long and contain at least one letter and one number",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class PasswordValidator : ConstraintValidator<ValidPassword, String?> {

    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean {
        if (value.isNullOrBlank()) return true
        return PasswordPolicy.isValid(value)
    }
}

object PasswordPolicy {
    const val MIN_BYTES = 8
    const val MAX_BYTES = 72

    fun isValid(password: String): Boolean {
        val bytes = password.toByteArray(Charsets.UTF_8).size
        return bytes in MIN_BYTES..MAX_BYTES &&
            password.any { it.isLetter() } &&
            password.any { it.isDigit() }
    }
}
