import { supabase } from "@/integrations/supabase/client";

export async function getValidFunctionAuthToken() {
  const { data, error } = await supabase.auth.refreshSession();
  const accessToken = data.session?.access_token;

  if (error || !accessToken) {
    return {
      token: null,
      error: "La sessione è scaduta o non è più valida. Effettua di nuovo il login e riprova.",
    };
  }

  return { token: accessToken, error: null };
}
