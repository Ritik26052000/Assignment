package com.taskflow.seed

import com.taskflow.activity.ActivityType
import com.taskflow.activity.TaskActivity
import com.taskflow.activity.TaskActivityRepository
import com.taskflow.project.Project
import com.taskflow.project.ProjectRepository
import com.taskflow.task.Task
import com.taskflow.task.TaskPriority
import com.taskflow.task.TaskRepository
import com.taskflow.task.TaskStatus
import com.taskflow.user.User
import com.taskflow.user.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/**
 * Creates a demo account with two projects and a spread of tasks (every status and priority, some
 * overdue, some unassigned) when `SEED_DEMO_DATA=true`. Idempotent: does nothing if the demo user exists.
 *
 * Demo credentials: demo@taskflow.com / Demo1234 (demo-only, hashed at seed time).
 */
@Component
@ConditionalOnProperty(name = ["taskflow.seed.demo-data"], havingValue = "true")
class DevDataSeeder(
    private val userRepository: UserRepository,
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val activityRepository: TaskActivityRepository,
    private val passwordEncoder: PasswordEncoder,
    private val clock: Clock,
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(DevDataSeeder::class.java)

    @Transactional
    override fun run(args: ApplicationArguments) {
        if (userRepository.existsByEmail(DEMO_EMAIL)) {
            log.info("Demo data already present, skipping seed")
            return
        }

        val hash = passwordEncoder.encode(DEMO_PASSWORD)
        val demo = userRepository.save(User("Demo User", DEMO_EMAIL, hash))
        val sam = userRepository.save(User("Sam Taylor", "sam@taskflow.com", hash))
        val priya = userRepository.save(User("Priya Patel", "priya@taskflow.com", hash))

        val today = LocalDate.now(clock)

        val website = projectRepository.save(
            Project("Website Redesign", "Refresh the marketing site: new landing page, pricing and blog.", demo),
        )
        val mobile = projectRepository.save(
            Project("Mobile App Launch", "Everything needed to ship v1.0 to the app stores.", demo),
        )

        val tasks = listOf(
            // Website Redesign
            Task("Draft new landing page copy", "Hero, features and call-to-action sections.", TaskStatus.TODO, TaskPriority.HIGH, today.plusDays(3), website, demo),
            Task("Collect brand assets", null, TaskStatus.TODO, TaskPriority.LOW, null, website, null),
            Task("Audit current site analytics", "Top pages, bounce rate, conversion funnel.", TaskStatus.TODO, TaskPriority.MEDIUM, today.minusDays(2), website, sam),
            Task("Design pricing page", "Three tiers, annual toggle.", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, today.plusDays(7), website, priya),
            Task("Set up staging environment", null, TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, today.minusDays(1), website, demo),
            Task("Choose CMS", "Compare three options and write a short recommendation.", TaskStatus.DONE, TaskPriority.MEDIUM, today.minusDays(10), website, sam),
            Task("Kick-off meeting", null, TaskStatus.DONE, TaskPriority.LOW, today.minusDays(14), website, null),
            // Mobile App Launch
            Task("Finalise onboarding flow", "Three screens, skippable.", TaskStatus.TODO, TaskPriority.HIGH, today.plusDays(1), mobile, priya),
            Task("Write store listing", "Description, keywords and screenshots.", TaskStatus.TODO, TaskPriority.MEDIUM, today.plusDays(14), mobile, null),
            Task("Fix crash on Android 12", "Reproducible on Pixel 5 when rotating the screen.", TaskStatus.IN_PROGRESS, TaskPriority.HIGH, today.minusDays(3), mobile, demo),
            Task("Push notification opt-in", null, TaskStatus.IN_PROGRESS, TaskPriority.LOW, null, mobile, sam),
            Task("Set up crash reporting", null, TaskStatus.DONE, TaskPriority.HIGH, today.minusDays(5), mobile, demo),
        ).let { taskRepository.saveAll(it) }

        // A small history so the activity timeline has something to show.
        tasks.filter { it.status != TaskStatus.TODO }.forEach { task ->
            if (task.status == TaskStatus.DONE) {
                activityRepository.save(activity(task, demo, TaskStatus.TODO, TaskStatus.IN_PROGRESS))
                activityRepository.save(activity(task, demo, TaskStatus.IN_PROGRESS, TaskStatus.DONE))
            } else {
                activityRepository.save(activity(task, demo, TaskStatus.TODO, TaskStatus.IN_PROGRESS))
            }
        }

        log.info("Seeded demo data: demo user {} (2 projects, {} tasks)", DEMO_EMAIL, tasks.size)
    }

    private fun activity(task: Task, actor: User, from: TaskStatus, to: TaskStatus) = TaskActivity(
        task = task,
        actor = actor,
        type = ActivityType.STATUS_CHANGED,
        fromValue = from.name,
        toValue = to.name,
    )

    companion object {
        const val DEMO_EMAIL = "demo@taskflow.com"
        const val DEMO_PASSWORD = "Demo1234"
    }
}
