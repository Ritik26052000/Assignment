package com.taskflow

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.assertEquals

/**
 * End-to-end API flow on the real Spring context (security filter chain, JSON, Flyway schema on H2).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaskFlowApiIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private val password = "Passw0rdX"
    private val today: LocalDate = LocalDate.now(ZoneOffset.UTC)

    // ---- helpers -----------------------------------------------------------------------------

    private fun body(vararg fields: Pair<String, Any?>): String = objectMapper.writeValueAsString(mapOf(*fields))

    private fun MockHttpServletRequestBuilder.json(payload: String?, token: String?): MockHttpServletRequestBuilder {
        if (payload != null) contentType(MediaType.APPLICATION_JSON).content(payload)
        if (token != null) header(HttpHeaders.AUTHORIZATION, "Bearer $token")
        return this
    }

    private fun ResultActions.tree(): JsonNode = objectMapper.readTree(andReturn().response.contentAsString)

    private fun uniqueEmail() = "user-${UUID.randomUUID()}@example.com"

    private fun register(email: String, name: String = "Test User", pwd: String = password): ResultActions =
        mockMvc.perform(post("/api/v1/auth/register").json(body("name" to name, "email" to email, "password" to pwd), null))

    /** Registers a fresh user and returns their bearer token. */
    private fun newUserToken(): String {
        val email = uniqueEmail()
        register(email).andExpect(status().isCreated)
        return mockMvc.perform(post("/api/v1/auth/login").json(body("email" to email, "password" to password), null))
            .andExpect(status().isOk)
            .tree()["token"].asText()
    }

    private fun createProject(token: String, name: String = "Project"): String =
        mockMvc.perform(post("/api/v1/projects").json(body("name" to name), token))
            .andExpect(status().isCreated)
            .tree()["id"].asText()

    private fun createTask(
        token: String,
        projectId: String,
        title: String,
        priority: String = "MEDIUM",
        dueDate: LocalDate? = null,
        status: String? = null,
    ): JsonNode = mockMvc.perform(
        post("/api/v1/projects/$projectId/tasks").json(
            body(
                "title" to title,
                "priority" to priority,
                "dueDate" to dueDate?.toString(),
                "status" to status,
            ),
            token,
        ),
    ).andExpect(status().isCreated).tree()

    private fun listTasks(token: String, projectId: String, query: String = ""): JsonNode =
        mockMvc.perform(get("/api/v1/projects/$projectId/tasks$query").json(null, token))
            .andExpect(status().isOk)
            .tree()

    private fun titles(page: JsonNode): List<String> = page["content"].map { it["title"].asText() }

    // ---- tests -------------------------------------------------------------------------------

    @Test
    fun `full flow - register, login, project, tasks, filter, sort, status change, summary, delete`() {
        // register: 201 + user DTO (no password data), duplicate email (any casing) -> 409
        val email = uniqueEmail()
        register(email, "Ada Lovelace")
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.email").value(email))
            .andExpect(jsonPath("$.name").value("Ada Lovelace"))
            .andExpect(jsonPath("$.password").doesNotExist())
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
        register(email.uppercase())
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_EXISTS"))
            .andExpect(jsonPath("$.fieldErrors[0].field").value("email"))

        // login: 200 + token
        val login = mockMvc.perform(post("/api/v1/auth/login").json(body("email" to email, "password" to password), null))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.expiresIn").isNumber)
            .andExpect(jsonPath("$.user.email").value(email))
            .tree()
        val token = login["token"].asText()

        // /users/me and /users
        mockMvc.perform(get("/api/v1/users/me").json(null, token))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.email").value(email))
        mockMvc.perform(get("/api/v1/users").json(null, token))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].id").exists())
            .andExpect(jsonPath("$.content[0].email").value(email))
            .andExpect(jsonPath("$.page").value(0))
            .andExpect(jsonPath("$.totalElements").isNumber)

        // project
        val projectId = createProject(token, "Launch")
        mockMvc.perform(get("/api/v1/projects").json(null, token))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(projectId))
        mockMvc.perform(get("/api/v1/projects/$projectId").json(null, token))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Launch"))

        // tasks: defaults applied on create
        val low = createTask(token, projectId, "Low, due in 5 days", "LOW", today.plusDays(5))
        assertEquals("TODO", low["status"].asText())
        createTask(token, projectId, "High, no due date", "HIGH", null)
        createTask(token, projectId, "Medium, due in 2 days", "MEDIUM", today.plusDays(2), "IN_PROGRESS")
        createTask(token, projectId, "High, due tomorrow", "HIGH", today.plusDays(1))

        // sort by due date: ascending and descending, undated tasks last in BOTH directions
        assertEquals(
            listOf("High, due tomorrow", "Medium, due in 2 days", "Low, due in 5 days", "High, no due date"),
            titles(listTasks(token, projectId, "?sort=dueDate,asc")),
        )
        assertEquals(
            listOf("Low, due in 5 days", "Medium, due in 2 days", "High, due tomorrow", "High, no due date"),
            titles(listTasks(token, projectId, "?sort=dueDate,desc")),
        )

        // sort by priority is semantic (LOW < MEDIUM < HIGH), not alphabetical
        val byPriorityDesc = listTasks(token, projectId, "?sort=priority,desc")["content"].map { it["priority"].asText() }
        assertEquals(listOf("HIGH", "HIGH", "MEDIUM", "LOW"), byPriorityDesc)
        val byPriorityAsc = listTasks(token, projectId, "?sort=priority,asc")["content"].map { it["priority"].asText() }
        assertEquals(listOf("LOW", "MEDIUM", "HIGH", "HIGH"), byPriorityAsc)

        // filters combine with AND
        assertEquals(2, listTasks(token, projectId, "?priority=HIGH")["totalElements"].asInt())
        assertEquals(
            listOf("Medium, due in 2 days"),
            titles(listTasks(token, projectId, "?status=IN_PROGRESS")),
        )
        assertEquals(0, listTasks(token, projectId, "?status=DONE&priority=HIGH")["totalElements"].asInt())
        assertEquals(4, listTasks(token, projectId, "?assigneeId=unassigned")["totalElements"].asInt())

        // pagination: own envelope, no overlap, size clamped to 100
        val page0 = listTasks(token, projectId, "?size=3&page=0&sort=dueDate,asc")
        val page1 = listTasks(token, projectId, "?size=3&page=1&sort=dueDate,asc")
        assertEquals(3, page0["content"].size())
        assertEquals(1, page1["content"].size())
        assertEquals(4, page0["totalElements"].asInt())
        assertEquals(2, page0["totalPages"].asInt())
        assertEquals(false, page0["last"].asBoolean())
        assertEquals(true, page1["last"].asBoolean())
        assertEquals(100, listTasks(token, projectId, "?size=10000")["size"].asInt())

        // PATCH status: change is recorded, repeating it is a no-op
        val taskId = low["id"].asText()
        mockMvc.perform(patch("/api/v1/tasks/$taskId/status").json(body("status" to "DONE"), token))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("DONE"))
        mockMvc.perform(patch("/api/v1/tasks/$taskId/status").json(body("status" to "DONE"), token))
            .andExpect(status().isOk)
        mockMvc.perform(get("/api/v1/tasks/$taskId/activity").json(null, token))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].fromValue").value("TODO"))
            .andExpect(jsonPath("$[0].toValue").value("DONE"))
            .andExpect(jsonPath("$[0].actorName").value("Ada Lovelace"))
            .andExpect(jsonPath("$[0].taskTitle").value(low["title"].asText()))

        mockMvc.perform(get("/api/v1/projects/$projectId/activity").json(null, token))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].taskId").value(taskId))
            .andExpect(jsonPath("$[0].taskTitle").value(low["title"].asText()))
            .andExpect(jsonPath("$[0].toValue").value("DONE"))

        // PUT: full update of editable fields
        mockMvc.perform(
            put("/api/v1/tasks/$taskId").json(
                body("title" to "Renamed", "priority" to "HIGH", "dueDate" to today.plusDays(9).toString()),
                token,
            ),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.title").value("Renamed"))
            .andExpect(jsonPath("$.priority").value("HIGH"))
            .andExpect(jsonPath("$.status").value("DONE"))

        // summary: every status present, zero-filled, total adds up
        mockMvc.perform(get("/api/v1/projects/$projectId/summary").json(null, token))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.byStatus.TODO").value(2))
            .andExpect(jsonPath("$.byStatus.IN_PROGRESS").value(1))
            .andExpect(jsonPath("$.byStatus.DONE").value(1))
            .andExpect(jsonPath("$.total").value(4))
            .andExpect(jsonPath("$.overdue").value(0))

        // delete: 204, then 404
        mockMvc.perform(delete("/api/v1/tasks/$taskId").json(null, token)).andExpect(status().isNoContent)
        mockMvc.perform(delete("/api/v1/tasks/$taskId").json(null, token))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.code").value("NOT_FOUND"))
        assertEquals(3, listTasks(token, projectId)["totalElements"].asInt())
    }

    @Test
    fun `another user gets 404 for resources they do not own`() {
        val owner = newUserToken()
        val intruder = newUserToken()
        val projectId = createProject(owner)
        val taskId = createTask(owner, projectId, "Private task")["id"].asText()

        mockMvc.perform(get("/api/v1/projects").json(null, intruder))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))

        val probes: List<MockHttpServletRequestBuilder> = listOf(
            get("/api/v1/projects/$projectId").json(null, intruder),
            get("/api/v1/projects/$projectId/tasks").json(null, intruder),
            get("/api/v1/projects/$projectId/summary").json(null, intruder),
            get("/api/v1/projects/$projectId/activity").json(null, intruder),
            post("/api/v1/projects/$projectId/tasks").json(body("title" to "Sneaky"), intruder),
            put("/api/v1/tasks/$taskId").json(body("title" to "Hijacked"), intruder),
            patch("/api/v1/tasks/$taskId/status").json(body("status" to "DONE"), intruder),
            get("/api/v1/tasks/$taskId/activity").json(null, intruder),
            delete("/api/v1/tasks/$taskId").json(null, intruder),
        )
        probes.forEach { request ->
            mockMvc.perform(request)
                .andExpect(status().isNotFound) // 404, never 403: ids cannot be probed
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
        }

        // ...and nothing was changed.
        mockMvc.perform(get("/api/v1/projects/$projectId/tasks").json(null, owner))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].title").value("Private task"))
            .andExpect(jsonPath("$.totalElements").value(1))
    }

    @Test
    fun `authentication failures are 401 in the standard error shape`() {
        mockMvc.perform(get("/api/v1/projects"))
            .andExpect(status().isUnauthorized)
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.error").value("Unauthorized"))
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.path").value("/api/v1/projects"))
            .andExpect(jsonPath("$.timestamp").exists())

        mockMvc.perform(get("/api/v1/projects").json(null, "not.a.jwt"))
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))

        val email = uniqueEmail()
        register(email).andExpect(status().isCreated)
        val wrongPassword = mockMvc.perform(post("/api/v1/auth/login").json(body("email" to email, "password" to "WrongPass9"), null))
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
            .tree()
        val unknownEmail = mockMvc.perform(post("/api/v1/auth/login").json(body("email" to uniqueEmail(), "password" to password), null))
            .andExpect(status().isUnauthorized)
            .tree()
        assertEquals(wrongPassword["message"].asText(), unknownEmail["message"].asText())
    }

    @Test
    fun `invalid input returns 400 with field-level errors`() {
        // registration rules: name, email format, password policy
        register("not-an-email", name = "A", pwd = "short1")
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.fieldErrors[?(@.field=='name')]").exists())
            .andExpect(jsonPath("$.fieldErrors[?(@.field=='email')]").exists())
            .andExpect(jsonPath("$.fieldErrors[?(@.field=='password')]").exists())
        register(uniqueEmail(), pwd = "onlyletters")
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors[?(@.field=='password')]").exists())
        register(uniqueEmail(), pwd = "a1".repeat(40)) // 80 bytes > BCrypt's 72
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors[?(@.field=='password')]").exists())

        val token = newUserToken()
        val projectId = createProject(token)

        // title: blank and too long
        mockMvc.perform(post("/api/v1/projects/$projectId/tasks").json(body("title" to "   "), token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
            .andExpect(jsonPath("$.fieldErrors[0].field").value("title"))
            .andExpect(jsonPath("$.path").value("/api/v1/projects/$projectId/tasks"))
        mockMvc.perform(post("/api/v1/projects/$projectId/tasks").json(body("title" to "x".repeat(121)), token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors[0].field").value("title"))
        mockMvc.perform(post("/api/v1/projects/$projectId/tasks").json(body("title" to "x".repeat(120)), token))
            .andExpect(status().isCreated)

        // due date in the past is rejected on create
        mockMvc.perform(
            post("/api/v1/projects/$projectId/tasks").json(
                body("title" to "Too late", "dueDate" to today.minusDays(1).toString()),
                token,
            ),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors[0].field").value("dueDate"))

        // unknown assignee
        mockMvc.perform(
            post("/api/v1/projects/$projectId/tasks").json(
                body("title" to "Nobody home", "assigneeId" to UUID.randomUUID().toString()),
                token,
            ),
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors[0].field").value("assigneeId"))

        // malformed JSON, unknown enum value, bad UUID, bad sort key, bad assignee filter
        mockMvc.perform(post("/api/v1/projects/$projectId/tasks").json("{not json", token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
        mockMvc.perform(post("/api/v1/projects/$projectId/tasks").json(body("title" to "t", "priority" to "URGENT"), token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
            .andExpect(jsonPath("$.fieldErrors[0].field").value("priority"))
        mockMvc.perform(get("/api/v1/projects/not-a-uuid/tasks").json(null, token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
        mockMvc.perform(get("/api/v1/projects/$projectId/tasks?sort=title,asc").json(null, token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors[0].field").value("sort"))
        mockMvc.perform(get("/api/v1/projects/$projectId/tasks?assigneeId=bogus").json(null, token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors[0].field").value("assigneeId"))
        mockMvc.perform(get("/api/v1/projects/$projectId/tasks?status=NOPE").json(null, token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))

        // project name rules
        mockMvc.perform(post("/api/v1/projects").json(body("name" to ""), token))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors[0].field").value("name"))

        // unknown route is a JSON 404, not a 500
        mockMvc.perform(get("/api/v1/does-not-exist").json(null, token))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.code").value("NOT_FOUND"))
    }
}
