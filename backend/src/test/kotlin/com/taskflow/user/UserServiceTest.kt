package com.taskflow.user

import com.taskflow.activity.TaskActivityRepository
import com.taskflow.common.BadRequestException
import com.taskflow.common.DuplicateEmailException
import com.taskflow.common.ResourceNotFoundException
import com.taskflow.project.ProjectRepository
import com.taskflow.task.TaskRepository
import io.mockk.clearAllMocks
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.crypto.password.PasswordEncoder
import java.time.Instant
import java.util.Optional
import java.util.UUID
import kotlin.test.assertEquals

class UserServiceTest {

    private val userRepository = mockk<UserRepository>()
    private val passwordEncoder = mockk<PasswordEncoder>()
    private val projectRepository = mockk<ProjectRepository>()
    private val taskRepository = mockk<TaskRepository>()
    private val taskActivityRepository = mockk<TaskActivityRepository>()
    private val service = UserService(
        userRepository,
        UserMapper(),
        passwordEncoder,
        projectRepository,
        taskRepository,
        taskActivityRepository,
    )

    private val userId = UUID.fromString("11111111-1111-1111-1111-111111111111")

    @BeforeEach
    fun resetMocks() = clearAllMocks()

    private fun storedUser(
        id: UUID = userId,
        email: String = "ada@example.com",
    ) = User(
        name = "Ada",
        email = email,
        passwordHash = "stored-hash",
        id = id,
    ).apply { createdAt = Instant.parse("2026-11-18T10:00:00Z") }

    @Test
    fun `createUser lowercases email and hashes the password`() {
        every { userRepository.existsByEmail("ada@example.com") } returns false
        every { passwordEncoder.encode("Secret1234") } returns "hashed"
        every { userRepository.saveAndFlush(any<User>()) } answers {
            firstArg<User>().apply {
                id = userId
                createdAt = Instant.parse("2026-11-18T10:00:00Z")
            }
        }

        val dto = service.createUser(CreateUserRequest("  Ada  ", "  Ada@Example.COM ", "Secret1234"))

        assertEquals("Ada", dto.name)
        assertEquals("ada@example.com", dto.email)
        verify { passwordEncoder.encode("Secret1234") }
    }

    @Test
    fun `createUser rejects duplicate email`() {
        every { userRepository.existsByEmail("ada@example.com") } returns true

        assertThrows<DuplicateEmailException> {
            service.createUser(CreateUserRequest("Ada", "ada@example.com", "Secret1234"))
        }
    }

    @Test
    fun `updateUser changes name and email without touching password when blank`() {
        val user = storedUser()
        every { userRepository.findById(userId) } returns Optional.of(user)
        every { userRepository.existsByEmailAndIdNot("lovelace@example.com", userId) } returns false
        every { userRepository.saveAndFlush(user) } returns user

        val dto = service.updateUser(
            userId,
            UpdateUserRequest(name = "Ada Lovelace", email = "lovelace@example.com", password = "  "),
        )

        assertEquals("Ada Lovelace", dto.name)
        assertEquals("lovelace@example.com", dto.email)
        assertEquals("stored-hash", user.passwordHash)
        verify(exactly = 0) { passwordEncoder.encode(any()) }
    }

    @Test
    fun `deleteUser is blocked when the user still owns projects`() {
        every { userRepository.findById(userId) } returns Optional.of(storedUser())
        every { projectRepository.existsByOwnerId(userId) } returns true

        assertThrows<BadRequestException> { service.deleteUser(userId) }
        verify(exactly = 0) { userRepository.deleteById(any()) }
    }

    @Test
    fun `deleteUser clears assignees and activity then removes the user`() {
        every { userRepository.findById(userId) } returns Optional.of(storedUser())
        every { projectRepository.existsByOwnerId(userId) } returns false
        every { taskActivityRepository.deleteByActorId(userId) } returns 2
        every { taskRepository.clearAssignee(userId) } returns 3
        every { userRepository.deleteById(userId) } returns Unit

        service.deleteUser(userId)

        verify { taskActivityRepository.deleteByActorId(userId) }
        verify { taskRepository.clearAssignee(userId) }
        verify { userRepository.deleteById(userId) }
    }

    @Test
    fun `getUser throws when missing`() {
        every { userRepository.findById(userId) } returns Optional.empty()

        assertThrows<ResourceNotFoundException> { service.getUser(userId) }
    }
}
