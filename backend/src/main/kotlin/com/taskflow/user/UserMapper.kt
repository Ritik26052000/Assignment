package com.taskflow.user

import org.springframework.stereotype.Component

/** Mapper pattern: the only place where [User] entities are turned into DTOs. */
@Component
class UserMapper {

    fun toDto(user: User): UserDto = UserDto(
        id = requireNotNull(user.id) { "User must be persisted before mapping" },
        name = user.name,
        email = user.email,
        createdAt = requireNotNull(user.createdAt) { "User must be persisted before mapping" },
    )

    fun toSummary(user: User): UserSummaryDto = UserSummaryDto(
        id = requireNotNull(user.id) { "User must be persisted before mapping" },
        name = user.name,
    )
}
