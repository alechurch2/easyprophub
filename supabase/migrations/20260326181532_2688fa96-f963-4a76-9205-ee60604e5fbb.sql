CREATE POLICY "Admins can update all accounts"
ON public.trading_accounts
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));