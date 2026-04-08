
CREATE OR REPLACE FUNCTION public.get_user_license_settings(_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'license_level', license_level::text,
      'training_access_level', training_access_level,
      'ai_assistant_enabled', ai_assistant_enabled,
      'chart_review_monthly_limit', chart_review_monthly_limit,
      'premium_review_monthly_limit', premium_review_monthly_limit,
      'account_center_enabled', account_center_enabled,
      'trade_execution_enabled', trade_execution_enabled
    )
    FROM public.user_license_settings
    WHERE user_id = _user_id),
    jsonb_build_object(
      'license_level', 'free',
      'training_access_level', 'partial',
      'ai_assistant_enabled', true,
      'chart_review_monthly_limit', 5,
      'premium_review_monthly_limit', 1,
      'account_center_enabled', false,
      'trade_execution_enabled', false
    )
  )
$$;
