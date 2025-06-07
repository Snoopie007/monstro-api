CREATE TYPE WorkflowStatus AS ENUM ('Draft', 'Active', 'Pause', 'Archived');
CREATE TYPE WorkflowQueueStatus AS ENUM ('Processing', 'Completed', 'Failed', 'Cancelled');

CREATE TABLE IF NOT EXISTS workflows (
    id bigserial PRIMARY KEY NOT NULL,
    location_id bigint NOT NULL,
    name text NOT NULL,
    description text,
    status WorkflowStatus NOT NULL DEFAULT 'Draft',
    nodes jsonb[] NOT NULL DEFAULT '{}',
    invalid_nodes text[] NOT NULL DEFAULT '{}',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT workflows_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS workflows_location_id_idx ON workflows(location_id);
CREATE INDEX IF NOT EXISTS workflows_status_idx ON workflows(status);

CREATE TABLE IF NOT EXISTS workflow_queues (
    id bigserial PRIMARY KEY NOT NULL,
    workflow_id bigint NOT NULL,
    member_id bigint,
    current_node text NOT NULL DEFAULT 'start',
    completed_nodes text[] NOT NULL DEFAULT '{}',
    status WorkflowStatus NOT NULL DEFAULT 'Draft',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT workflow_queues_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    CONSTRAINT workflow_queues_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS workflow_queues_workflow_id_idx ON workflow_queues(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_queues_member_id_idx ON workflow_queues(member_id);
CREATE INDEX IF NOT EXISTS workflow_queues_status_idx ON workflow_queues(status);

CREATE TABLE IF NOT EXISTS workflow_logs (
    id bigserial PRIMARY KEY NOT NULL,
    workflow_id bigint NOT NULL,
    queue_id bigint NOT NULL,
    node_id text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT workflow_logs_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    CONSTRAINT workflow_logs_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES workflow_queues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS workflow_logs_workflow_id_idx ON workflow_logs(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_logs_queue_id_idx ON workflow_logs(queue_id);
CREATE INDEX IF NOT EXISTS workflow_logs_created_at_idx ON workflow_logs(created_at);
