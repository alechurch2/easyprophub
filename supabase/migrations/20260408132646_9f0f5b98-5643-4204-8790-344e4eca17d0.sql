
-- Create a safe encryption function that reads key from vault/config internally
-- The key is stored as a Supabase secret and made available via a DB setting
CREATE OR REPLACE FUNCTION public.encrypt_investor_pwd(_plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _key text;
BEGIN
  IF _plaintext IS NULL OR _plaintext = '' THEN
    RETURN _plaintext;
  END IF;
  
  -- Read encryption key from app settings (set via ALTER DATABASE)
  _key := current_setting('app.investor_encryption_key', true);
  
  IF _key IS NULL OR _key = '' THEN
    -- Fallback: return plaintext if no key configured
    RETURN _plaintext;
  END IF;
  
  RETURN encode(
    pgcrypto.encrypt(
      convert_to(_plaintext, 'utf8'),
      convert_to(_key, 'utf8'),
      'aes'
    ),
    'base64'
  );
END;
$$;

-- Matching decrypt that also reads key internally
CREATE OR REPLACE FUNCTION public.decrypt_investor_pwd(_account_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _encrypted text;
  _key text;
BEGIN
  SELECT investor_password INTO _encrypted
  FROM public.trading_accounts
  WHERE id = _account_id;
  
  IF _encrypted IS NULL OR _encrypted = '' THEN
    RETURN NULL;
  END IF;
  
  _key := current_setting('app.investor_encryption_key', true);
  
  IF _key IS NULL OR _key = '' THEN
    RETURN _encrypted;
  END IF;
  
  BEGIN
    RETURN convert_from(
      pgcrypto.decrypt(
        decode(_encrypted, 'base64'),
        convert_to(_key, 'utf8'),
        'aes'
      ),
      'utf8'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN _encrypted;
  END;
END;
$$;
