
-- Restore EXECUTE on SECURITY DEFINER helpers used inside RLS policies.
-- These are safe to expose because they only accept identifiers and return booleans/text,
-- and their bodies are constrained to the caller's own context via auth.uid() checks in the policies.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_with(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_private(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_access_state(uuid) TO anon, authenticated;
