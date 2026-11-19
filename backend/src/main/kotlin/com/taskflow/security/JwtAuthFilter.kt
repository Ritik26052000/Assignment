package com.taskflow.security

import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.JwtException
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Reads `Authorization: Bearer <jwt>`, validates it and populates the security context.
 *
 * An invalid token never short-circuits the request here. The failure reason is stored as a request
 * attribute and the chain continues unauthenticated, so public endpoints keep working and protected
 * ones are rejected by [JwtAuthenticationEntryPoint] with the standard JSON error.
 *
 * Intentionally NOT a Spring bean: it is created inside `SecurityConfig` so Boot does not also
 * register it as a plain servlet filter (which would run it twice).
 */
class JwtAuthFilter(
    private val jwtService: JwtService,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(JwtAuthFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val header = request.getHeader(HEADER)
        if (header != null && header.startsWith(BEARER_PREFIX, ignoreCase = true)
            && SecurityContextHolder.getContext().authentication == null
        ) {
            val token = header.substring(BEARER_PREFIX.length).trim()
            try {
                val principal = jwtService.parse(token)
                val authentication = UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()).apply {
                    details = WebAuthenticationDetailsSource().buildDetails(request)
                }
                SecurityContextHolder.getContext().authentication = authentication
            } catch (e: ExpiredJwtException) {
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Token has expired")
            } catch (e: JwtException) {
                log.debug("Rejected JWT: {}", e.message)
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Invalid authentication token")
            } catch (e: IllegalArgumentException) {
                log.debug("Rejected JWT: {}", e.message)
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Invalid authentication token")
            }
        }
        filterChain.doFilter(request, response)
    }

    companion object {
        const val AUTH_ERROR_ATTRIBUTE = "taskflow.auth.error"
        private const val HEADER = "Authorization"
        private const val BEARER_PREFIX = "Bearer "
    }
}
