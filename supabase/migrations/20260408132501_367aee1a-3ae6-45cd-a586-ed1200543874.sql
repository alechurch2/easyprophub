
-- Drop the trigger approach (encryption will happen in edge functions instead)
DROP TRIGGER IF EXISTS encrypt_investor_pwd_trigger ON public.trading_accounts;
DROP FUNCTION IF EXISTS public.encrypt_investor_password();

-- Replace decrypt function to accept key as parameter (service_role only)
CREATE OR REPLACE FUNCTION public.decrypt_investor_password(_account_id uuid, _key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _encrypted text;
BEGIN
  SELECT investor_password INTO _encrypted
  FROM public.trading_accounts
  WHERE id = _account_id;
  
  IF _encrypted IS NULL OR _encrypted = '' THEN
    RETURN NULL;
  END IF;
  
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
    -- If decryption fails, assume plaintext (pre-encryption data)
    RETURN _encrypted;
  END;
END;
$$;

-- Create encrypt helper function for edge functions to call
CREATE OR REPLACE FUNCTION public.encrypt_text_value(_plaintext text, _key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _plaintext IS NULL OR _plaintext = '' OR _key IS NULL OR _key = '' THEN
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
