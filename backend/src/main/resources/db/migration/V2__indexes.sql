-- Indexes backing the owner-scoped lookups, task listing filters/sorts and the summary query.

CREATE INDEX idx_projects_owner ON projects (owner_id);

CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);
CREATE INDEX idx_tasks_project_due_date ON tasks (project_id, due_date);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);
