package com.taskflow.common

import org.springframework.data.domain.Page

/** Our own paging envelope, so the API contract does not depend on Spring's `Page` JSON. */
data class PageResponse<T>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val last: Boolean,
) {
    companion object {
        fun <S, T> from(page: Page<S>, transform: (S) -> T): PageResponse<T> = PageResponse(
            content = page.content.map(transform),
            page = page.number,
            size = page.size,
            totalElements = page.totalElements,
            totalPages = page.totalPages,
            last = page.isLast,
        )
    }
}
