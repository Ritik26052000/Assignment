package com.taskflow.security

import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.MalformedJwtException
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey

/** A freshly signed token plus its lifetime. */
data class IssuedToken(val token: String, val expiresInSeconds: Long)

/**
 * Issues and verifies HS256 JWTs.
 *
 * Fails fast at startup if `JWT_SECRET` is missing or shorter than 256 bits (32 bytes).
 */
@Service
class JwtService(
    properties: JwtProperties,
    private val clock: Clock,
) {
    private val key: SecretKey
    private val lifetime: Duration

    init {
        val secretBytes = properties.secret.toByteArray(Charsets.UTF_8)
        check(properties.secret.isNotBlank()) {
            "JWT_SECRET is not set. Provide a secret of at least $MIN_SECRET_BYTES bytes (256 bits)."
        }
        check(secretBytes.size >= MIN_SECRET_BYTES) {
            "JWT_SECRET is too short (${secretBytes.size} bytes). It must be at least $MIN_SECRET_BYTES bytes (256 bits)."
        }
        check(properties.expirationMinutes > 0) { "JWT_EXPIRATION_MINUTES must be greater than zero." }
        key = Keys.hmacShaKeyFor(secretBytes)
        lifetime = Duration.ofMinutes(properties.expirationMinutes)
    }

    private val parser = Jwts.parser()
        .verifyWith(key)
        .requireIssuer(ISSUER)
        .clock { Date.from(clock.instant()) }
        .build()

    fun issue(userId: UUID, email: String): IssuedToken {
        val now: Instant = clock.instant()
        val token = Jwts.builder()
            .issuer(ISSUER)
            .subject(userId.toString())
            .claim(EMAIL_CLAIM, email)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(lifetime)))
            .signWith(key, Jwts.SIG.HS256)
            .compact()
        return IssuedToken(token, lifetime.seconds)
    }

    /**
     * Verifies signature, algorithm, issuer, expiry and subject.
     * @throws JwtException for any invalid, tampered, malformed or expired token.
     */
    fun parse(token: String): UserPrincipal {
        val jws = parser.parseSignedClaims(token)
        if (jws.header.algorithm != "HS256") {
            throw MalformedJwtException("Unexpected signing algorithm")
        }
        val claims = jws.payload
        val subject = claims.subject ?: throw MalformedJwtException("Token has no subject")
        val userId = try {
            UUID.fromString(subject)
        } catch (e: IllegalArgumentException) {
            throw MalformedJwtException("Token subject is not a valid id", e)
        }
        val email = claims.get(EMAIL_CLAIM, String::class.java) ?: ""
        return UserPrincipal(userId, email)
    }

    companion object {
        const val MIN_SECRET_BYTES = 32
        private const val ISSUER = "taskflow"
        private const val EMAIL_CLAIM = "email"
    }
}
