-- Task activity log (status changes). Rows are removed together with their task.

CREATE TABLE task_activities (
    id         UUID                     NOT NULL,
    task_id    UUID                     NOT NULL,
    actor_id   UUID                     NOT NULL,
    type       VARCHAR(30)              NOT NULL,
    from_value VARCHAR(50),
    to_value   VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_task_activities PRIMARY KEY (id),
    CONSTRAINT fk_task_activities_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_activities_actor FOREIGN KEY (actor_id) REFERENCES users (id)
);

CREATE INDEX idx_task_activities_task_created ON task_activities (task_id, created_at);
