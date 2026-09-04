-- Remove public access to the obsolete personalized-feed RPC.
--
-- Obsolete signature:
-- get_personalized_feed(uuid, uuid[], integer)
--
-- The current application uses the newer personalized-feed implementation.

REVOKE ALL
ON FUNCTION public.get_personalized_feed(uuid, uuid[], integer)
FROM PUBLIC, anon, authenticated;
