-- Core schema. Portable SQL: runs on PostgreSQL (runtime) and H2 (tests).

CREATE TABLE users (
    id            UUID                     NOT NULL,
    name          VARCHAR(80)              NOT NULL,
    email         VARCHAR(254)             NOT NULL,
    password_hash VARCHAR(100)             NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE projects (
    id          UUID                     NOT NULL,
    name        VARCHAR(100)             NOT NULL,
    description VARCHAR(1000),
    owner_id    UUID                     NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_projects PRIMARY KEY (id),
    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE TABLE tasks (
    id          UUID                     NOT NULL,
    title       VARCHAR(120)             NOT NULL,
    description VARCHAR(2000),
    status      VARCHAR(20)              NOT NULL,
    priority    VARCHAR(20)              NOT NULL,
    due_date    DATE,
    assignee_id UUID,
    project_id  UUID                     NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_tasks PRIMARY KEY (id),
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users (id),
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT ck_tasks_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    CONSTRAINT ck_tasks_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'))
);
