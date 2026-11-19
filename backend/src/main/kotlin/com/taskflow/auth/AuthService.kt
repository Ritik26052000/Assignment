package com.taskflow.auth

import com.taskflow.common.DuplicateEmailException
import com.taskflow.security.JwtService
import com.taskflow.user.User
import com.taskflow.user.UserDto
import com.taskflow.user.UserMapper
import com.taskflow.user.UserRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.Locale

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
    private val userMapper: UserMapper,
) {

    @Transactional
    fun register(request: RegisterRequest): UserDto {
        val email = normalizeEmail(request.email)
        if (userRepository.existsByEmail(email)) throw DuplicateEmailException()

        val user = User(
            name = request.name.trim(),
            email = email,
            passwordHash = passwordEncoder.encode(request.password),
        )
        val saved = try {
            userRepository.saveAndFlush(user)
        } catch (e: DataIntegrityViolationException) {
            // Two simultaneous registrations with the same email: the unique index decides.
            throw DuplicateEmailException()
        }
        return userMapper.toDto(saved)
    }

    @Transactional(readOnly = true)
    fun login(request: LoginRequest): AuthResponse {
        val email = normalizeEmail(request.email)
        val user = userRepository.findByEmail(email)

        // Always run one BCrypt comparison, even for unknown emails, so response time and message
        // give no hint about which emails exist.
        val withinBcryptLimit = request.password.toByteArray(Charsets.UTF_8).size <= PasswordPolicy.MAX_BYTES
        val passwordMatches = withinBcryptLimit &&
            passwordEncoder.matches(request.password, user?.passwordHash ?: DUMMY_HASH)

        if (user == null || !passwordMatches) throw BadCredentialsException(INVALID_CREDENTIALS_MESSAGE)

        val userId = requireNotNull(user.id)
        val issued = jwtService.issue(userId, user.email)
        return AuthResponse(
            token = issued.token,
            expiresIn = issued.expiresInSeconds,
            user = userMapper.toDto(user),
        )
    }

    private fun normalizeEmail(email: String): String = email.trim().lowercase(Locale.ROOT)

    companion object {
        const val INVALID_CREDENTIALS_MESSAGE = "Invalid email or password"

        /** A well-formed BCrypt hash (cost 10) that matches nothing we would ever accept. */
        private const val DUMMY_HASH = "\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
    }
}
