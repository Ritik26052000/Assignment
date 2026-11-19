package com.taskflow.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

/**
 * Single source of "now". Everything that needs the current time (JWT, overdue maths, auditing,
 * error timestamps) injects this [Clock], so tests can pin the date.
 */
@Configuration
class ClockConfig {
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
