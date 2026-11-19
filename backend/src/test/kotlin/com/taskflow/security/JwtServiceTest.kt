package com.taskflow.security

import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.JwtException
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class JwtServiceTest {

    private val secret = "unit-test-only-secret-that-is-long-enough-0123456789"
    private val start = Instant.parse("2026-11-18T10:00:00Z")

    private fun service(
        secret: String = this.secret,
        at: Instant = start,
        minutes: Long = 5,
    ) = JwtService(JwtProperties(secret, minutes), Clock.fixed(at, ZoneOffset.UTC))

    @Test
    fun `fails fast when the secret is missing`() {
        val ex = assertThrows<IllegalStateException> { service(secret = "") }
        assertTrue(ex.message.orEmpty().contains("JWT_SECRET"))
    }

    @Test
    fun `fails fast when the secret is shorter than 256 bits`() {
        assertThrows<IllegalStateException> { service(secret = "too-short-secret") }
    }

    @Test
    fun `issued token round-trips to the same principal`() {
        val jwt = service()
        val userId = UUID.randomUUID()

        val issued = jwt.issue(userId, "ada@example.com")
        val principal = jwt.parse(issued.token)

        assertEquals(userId, principal.id)
        assertEquals("ada@example.com", principal.email)
        assertEquals(300L, issued.expiresInSeconds)
    }

    @Test
    fun `expired token is rejected`() {
        val token = service(at = start).issue(UUID.randomUUID(), "ada@example.com").token
        val later = service(at = start.plus(Duration.ofMinutes(10)))

        assertThrows<ExpiredJwtException> { later.parse(token) }
    }

    @Test
    fun `tampered token is rejected`() {
        val jwt = service()
        val token = jwt.issue(UUID.randomUUID(), "ada@example.com").token
        val tampered = token.dropLast(4) + "AAAA"

        assertThrows<JwtException> { jwt.parse(tampered) }
    }

    @Test
    fun `token signed with a different secret is rejected`() {
        val token = service(secret = "another-unit-test-secret-also-long-enough-987654321")
            .issue(UUID.randomUUID(), "ada@example.com").token

        assertThrows<JwtException> { service().parse(token) }
    }

    @Test
    fun `garbage is rejected`() {
        assertThrows<JwtException> { service().parse("definitely.not.jwt") }
    }
}
