package com.taskflow.security

import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import java.util.UUID

/** The authenticated caller, rebuilt from the JWT on every request (no database hit). */
data class UserPrincipal(
    val id: UUID,
    val email: String,
) : UserDetails {

    override fun getAuthorities(): Collection<GrantedAuthority> = listOf(SimpleGrantedAuthority("ROLE_USER"))

    override fun getPassword(): String? = null

    override fun getUsername(): String = email
}
