DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users insert notifications as actor" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
