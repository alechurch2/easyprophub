import { useState, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, User, Shield, Loader2, Calculator, Link2, Pencil } from "lucide-react";
import { useLicenseSettings } from "@/hooks/useLicenseSettings";
import { useRiskPreferences } from "@/hooks/useRiskPreferences";
const NotificationSettings = lazy(() => import("@/components/NotificationSettings"));

export default function AccountSettings() {
  const { user, profile } = useAuth();

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      toast({ title: "Errore", description: "Inserisci la nuova email.", variant: "destructive" });
      return;
    }
    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      toast({ title: "Errore", description: "La nuova email è uguale a quella attuale.", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast({
        title: "Email di conferma inviata",
        description: "Controlla la nuova casella email per confermare la modifica. Dovrai confermare sia sulla vecchia che sulla nuova email.",
      });
      setNewEmail("");
    } catch (err: any) {
      toast({ title: "Errore", description: err.message || "Impossibile aggiornare l'email.", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) {
      toast({ title: "Errore", description: "Inserisci la password attuale.", variant: "destructive" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Errore", description: "La nuova password deve avere almeno 6 caratteri.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Errore", description: "Le due password non coincidono.", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      // Verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });
      if (signInError) {
        toast({ title: "Errore", description: "La password attuale non è corretta.", variant: "destructive" });
        setPasswordLoading(false);
        return;
      }
      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password aggiornata", description: "La tua password è stata modificata con successo." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Errore", description: err.message || "Impossibile aggiornare la password.", variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
            Impostazioni Account
          </h1>
          <p className="text-muted-foreground mt-1">Gestisci le tue credenziali di accesso</p>
        </div>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Informazioni Account</CardTitle>
            </div>
            <CardDescription>I tuoi dati principali</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nome</span>
              <span className="text-sm font-medium text-foreground">{profile?.full_name || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{user?.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Stato</span>
              <Badge variant="secondary" className="text-xs">
                {profile?.status === "approved" ? "Attivo" : profile?.status || "—"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Email Change */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Cambia Email</CardTitle>
            </div>
            <CardDescription>Riceverai un'email di conferma su entrambi gli indirizzi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-email">Email attuale</Label>
              <Input id="current-email" value={user?.email || ""} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Nuova email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="nuova@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleEmailChange} disabled={emailLoading || !newEmail.trim()} className="w-full sm:w-auto">
              {emailLoading ? "Invio in corso…" : "Aggiorna email"}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Cambia Password</CardTitle>
            </div>
            <CardDescription>Per sicurezza, inserisci la password attuale prima di cambiarla</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Password attuale</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimo 6 caratteri"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Conferma nuova password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Ripeti la nuova password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full sm:w-auto"
            >
              {passwordLoading ? "Aggiornamento…" : "Aggiorna password"}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardContent className="pt-6">
            <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}>
              <NotificationSettings />
            </Suspense>
          </CardContent>
        </Card>

        {/* Security note */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30">
          <Shield className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Sicurezza</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Le modifiche alle credenziali sono gestite in modo sicuro dal sistema di autenticazione. Le password non vengono mai salvate in chiaro.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
