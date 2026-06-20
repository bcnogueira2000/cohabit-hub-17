
-- Trigger-only SECURITY DEFINER functions: revoke direct EXECUTE from anon/authenticated/public
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_create_from_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_create_checkout_tasks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_request_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_request_comment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_request_assignment_to_generated_task() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_request_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_request_comment_author() FROM PUBLIC, anon, authenticated;
