
-- Allow all approved users to view didactic examples that are visible
CREATE POLICY "Approved users can view didactic examples"
ON public.ai_chart_reviews
FOR SELECT
TO authenticated
USING (
  is_didactic_example = true 
  AND didactic_visible = true 
  AND get_user_status(auth.uid()) = 'approved'::user_status
);
