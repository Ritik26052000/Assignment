package com.taskflow.project

import com.taskflow.common.ResourceNotFoundException
import com.taskflow.user.User
import com.taskflow.user.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.Instant
import java.util.Optional
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ProjectServiceTest {

    private val projectRepository = mockk<ProjectRepository>()
    private val userRepository = mockk<UserRepository>()
    private val service = ProjectService(projectRepository, userRepository, ProjectMapper())

    private val now = Instant.parse("2026-11-18T10:00:00Z")
    private val ownerId = UUID.randomUUID()
    private val otherUserId = UUID.randomUUID()
    private val owner = User("Owner", "owner@example.com", "hash", ownerId).apply { createdAt = now }

    private fun project(name: String = "Alpha") =
        Project(name, "desc", owner, UUID.randomUUID()).apply { createdAt = now }

    @Test
    fun `listProjects only asks for the calling user's projects`() {
        val mine = project("Mine")
        every { projectRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId) } returns listOf(mine)

        val result = service.listProjects(ownerId)

        assertEquals(listOf("Mine"), result.map { it.name })
        assertEquals(ownerId, result.single().ownerId)
        verify(exactly = 0) { projectRepository.findAll() }
    }

    @Test
    fun `getProject returns the project for its owner`() {
        val project = project()
        every { projectRepository.findByIdAndOwnerId(project.id!!, ownerId) } returns project

        assertEquals(project.id, service.getProject(ownerId, project.id!!).id)
    }

    @Test
    fun `getProject treats someone else's project as not found`() {
        val project = project()
        // The owner-scoped query returns nothing for a different user.
        every { projectRepository.findByIdAndOwnerId(project.id!!, otherUserId) } returns null

        val ex = assertThrows<ResourceNotFoundException> { service.getProject(otherUserId, project.id!!) }
        assertEquals("Project not found", ex.message)
    }

    @Test
    fun `createProject sets the caller as owner and trims input`() {
        val saved = slot<Project>()
        every { userRepository.findById(ownerId) } returns Optional.of(owner)
        every { projectRepository.save(capture(saved)) } answers {
            saved.captured.apply {
                id = UUID.randomUUID()
                createdAt = now
            }
        }

        val dto = service.createProject(ownerId, CreateProjectRequest("  Beta  ", "   "))

        assertEquals("Beta", dto.name)
        assertNull(dto.description, "blank description is stored as null")
        assertEquals(ownerId, dto.ownerId)
        assertEquals(owner, saved.captured.owner)
    }
}
