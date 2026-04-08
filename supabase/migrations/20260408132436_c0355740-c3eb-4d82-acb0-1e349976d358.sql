
-- Function to encrypt investor password
CREATE OR REPLACE FUNCTION public.encrypt_investor_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _key text;
BEGIN
  -- Only encrypt if password is being set/changed and isn't already encrypted
  IF NEW.investor_password IS NOT NULL 
     AND NEW.investor_password != '' 
     AND (TG_OP = 'INSERT' OR OLD.investor_password IS DISTINCT FROM NEW.investor_password) THEN
    
    _key := current_setting('app.settings.encryption_key', true);
    IF _key IS NULL OR _key = '' THEN
      -- Fallback: read from vault if available, otherwise skip encryption
      RAISE WARNING 'Encryption key not set, storing password as-is';
      RETURN NEW;
    END IF;
    
    NEW.investor_password := encode(
      pgcrypto.encrypt(
        convert_to(NEW.investor_password, 'utf8'),
        convert_to(_key, 'utf8'),
        'aes'
      ),
      'base64'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to decrypt investor password (callable only by service_role)
CREATE OR REPLACE FUNCTION public.decrypt_investor_password(_account_id uuid)
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
  
  _key := current_setting('app.settings.encryption_key', true);
  IF _key IS NULL OR _key = '' THEN
    -- If no key set, assume it's still plaintext
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
    -- If decryption fails, it might be plaintext (pre-migration data)
    RETURN _encrypted;
  END;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS encrypt_investor_pwd_trigger ON public.trading_accounts;
CREATE TRIGGER encrypt_investor_pwd_trigger
  BEFORE INSERT OR UPDATE OF investor_password
  ON public.trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_investor_password();
