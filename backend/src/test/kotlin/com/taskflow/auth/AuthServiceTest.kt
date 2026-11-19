package com.taskflow.auth

import com.taskflow.common.DuplicateEmailException
import com.taskflow.security.IssuedToken
import com.taskflow.security.JwtService
import com.taskflow.user.User
import com.taskflow.user.UserMapper
import com.taskflow.user.UserRepository
import io.mockk.clearAllMocks
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

class AuthServiceTest {

    private val userRepository = mockk<UserRepository>()
    private val passwordEncoder = mockk<PasswordEncoder>()
    private val jwtService = mockk<JwtService>()
    private val service = AuthService(userRepository, passwordEncoder, jwtService, UserMapper())

    @BeforeEach
    fun resetMocks() = clearAllMocks()

    private fun storedUser(email: String = "ada@example.com") = User(
        name = "Ada",
        email = email,
        passwordHash = "stored-hash",
        id = UUID.randomUUID(),
    ).apply { createdAt = Instant.parse("2026-11-18T10:00:00Z") }

    // ---- register ----------------------------------------------------------------------------

    @Test
    fun `register lowercases the email, trims the name and stores only the password hash`() {
        val saved = slot<User>()
        every { userRepository.existsByEmail("ada@example.com") } returns false
        every { passwordEncoder.encode("Secret1234") } returns "hashed"
        every { userRepository.saveAndFlush(capture(saved)) } answers {
            saved.captured.apply {
                id = UUID.randomUUID()
                createdAt = Instant.parse("2026-11-18T10:00:00Z")
            }
        }

        val dto = service.register(RegisterRequest("  Ada  ", "  Ada@Example.COM ", "Secret1234"))

        assertEquals("ada@example.com", dto.email)
        assertEquals("Ada", dto.name)
        assertEquals("hashed", saved.captured.passwordHash)
        assertNotEquals("Secret1234", saved.captured.passwordHash)
    }

    @Test
    fun `register rejects a duplicate email`() {
        every { userRepository.existsByEmail("ada@example.com") } returns true

        assertThrows<DuplicateEmailException> {
            service.register(RegisterRequest("Ada", "ada@example.com", "Secret1234"))
        }
        verify(exactly = 0) { userRepository.saveAndFlush(any<User>()) }
    }

    @Test
    fun `register maps a unique-index race to a duplicate email error`() {
        every { userRepository.existsByEmail(any()) } returns false
        every { passwordEncoder.encode(any()) } returns "hashed"
        every { userRepository.saveAndFlush(any<User>()) } throws DataIntegrityViolationException("uq_users_email")

        assertThrows<DuplicateEmailException> {
            service.register(RegisterRequest("Ada", "ada@example.com", "Secret1234"))
        }
    }

    // ---- login -------------------------------------------------------------------------------

    @Test
    fun `login returns a token and the user on valid credentials`() {
        val user = storedUser()
        every { userRepository.findByEmail("ada@example.com") } returns user
        every { passwordEncoder.matches("Secret1234", "stored-hash") } returns true
        every { jwtService.issue(user.id!!, "ada@example.com") } returns IssuedToken("jwt-token", 3600)

        val response = service.login(LoginRequest("ADA@example.com", "Secret1234"))

        assertEquals("jwt-token", response.token)
        assertEquals("Bearer", response.tokenType)
        assertEquals(3600L, response.expiresIn)
        assertEquals("ada@example.com", response.user.email)
    }

    @Test
    fun `login with a wrong password and login with an unknown email give the same message`() {
        every { userRepository.findByEmail("ada@example.com") } returns storedUser()
        every { userRepository.findByEmail("nobody@example.com") } returns null
        every { passwordEncoder.matches(any(), any()) } returns false

        val wrongPassword = assertThrows<BadCredentialsException> {
            service.login(LoginRequest("ada@example.com", "WrongPass1"))
        }
        val unknownEmail = assertThrows<BadCredentialsException> {
            service.login(LoginRequest("nobody@example.com", "Secret1234"))
        }

        assertEquals(wrongPassword.message, unknownEmail.message)
        assertEquals(AuthService.INVALID_CREDENTIALS_MESSAGE, unknownEmail.message)
        // The unknown-email path still performed a BCrypt comparison (timing, no user enumeration).
        verify(exactly = 2) { passwordEncoder.matches(any(), any()) }
    }

    @Test
    fun `login never issues a token for a bad password`() {
        every { userRepository.findByEmail(any()) } returns storedUser()
        every { passwordEncoder.matches(any(), any()) } returns false

        assertThrows<BadCredentialsException> { service.login(LoginRequest("ada@example.com", "WrongPass1")) }
        verify(exactly = 0) { jwtService.issue(any(), any()) }
    }
}
