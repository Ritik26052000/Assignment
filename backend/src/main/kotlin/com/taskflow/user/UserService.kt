package com.taskflow.user

import com.taskflow.activity.TaskActivityRepository
import com.taskflow.common.BadRequestException
import com.taskflow.common.DuplicateEmailException
import com.taskflow.common.PageResponse
import com.taskflow.common.ResourceNotFoundException
import com.taskflow.project.ProjectRepository
import com.taskflow.task.TaskRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.Locale
import java.util.UUID

@Service
@Transactional(readOnly = true)
class UserService(
    private val userRepository: UserRepository,
    private val userMapper: UserMapper,
    private val passwordEncoder: PasswordEncoder,
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val taskActivityRepository: TaskActivityRepository,
) {

    /** The caller's own profile. A valid token for a user that no longer exists is treated as unauthenticated. */
    fun getCurrentUser(userId: UUID): UserDto {
        val user = userRepository.findById(userId)
            .orElseThrow { BadCredentialsException("Account no longer exists") }
        return userMapper.toDto(user)
    }

    fun getUser(id: UUID): UserDto = userMapper.toDto(requireUser(id))

    /** Paginated users for the team page (and assignee pickers with a large page size). */
    fun listUsers(search: String?, page: Int, size: Int): PageResponse<UserDto> {
        val pageable = PageRequest.of(
            page.coerceAtLeast(0),
            size.coerceIn(1, MAX_PAGE_SIZE),
            Sort.by(Sort.Direction.ASC, "name"),
        )
        val query = search?.trim().orEmpty()
        val result = if (query.isEmpty()) {
            userRepository.findAll(pageable)
        } else {
            userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query, pageable)
        }
        return PageResponse.from(result, userMapper::toDto)
    }

    @Transactional
    fun createUser(request: CreateUserRequest): UserDto {
        val email = normalizeEmail(request.email)
        if (userRepository.existsByEmail(email)) throw DuplicateEmailException()

        val user = User(
            name = request.name.trim(),
            email = email,
            passwordHash = passwordEncoder.encode(request.password),
        )
        val saved = try {
            userRepository.saveAndFlush(user)
        } catch (_: DataIntegrityViolationException) {
            throw DuplicateEmailException()
        }
        return userMapper.toDto(saved)
    }

    @Transactional
    fun updateUser(id: UUID, request: UpdateUserRequest): UserDto {
        val user = requireUser(id)
        val email = normalizeEmail(request.email)

        if (userRepository.existsByEmailAndIdNot(email, id)) throw DuplicateEmailException()

        user.name = request.name.trim()
        user.email = email

        val newPassword = request.password?.trim().orEmpty()
        if (newPassword.isNotEmpty()) {
            user.passwordHash = passwordEncoder.encode(newPassword)
        }

        val saved = try {
            userRepository.saveAndFlush(user)
        } catch (_: DataIntegrityViolationException) {
            throw DuplicateEmailException()
        }
        return userMapper.toDto(saved)
    }

    @Transactional
    fun deleteUser(id: UUID) {
        requireUser(id)

        if (projectRepository.existsByOwnerId(id)) {
            throw BadRequestException(
                "Cannot delete a user who still owns projects. Delete or transfer their projects first.",
            )
        }

        taskActivityRepository.deleteByActorId(id)
        taskRepository.clearAssignee(id)
        userRepository.deleteById(id)
    }

    private fun requireUser(id: UUID): User =
        userRepository.findById(id).orElseThrow { ResourceNotFoundException("User not found") }

    private fun normalizeEmail(email: String): String = email.trim().lowercase(Locale.ROOT)

    companion object {
        const val MAX_PAGE_SIZE = 100
    }
}
