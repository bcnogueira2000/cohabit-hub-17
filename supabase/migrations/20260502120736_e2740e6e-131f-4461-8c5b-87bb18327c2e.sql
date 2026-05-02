
ALTER TABLE public.ops_tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID;
ALTER TABLE public.cleaning_tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID;

CREATE INDEX IF NOT EXISTS idx_ops_tasks_assigned_user ON public.ops_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_assigned_user ON public.cleaning_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_user ON public.requests(assigned_to_user_id);
