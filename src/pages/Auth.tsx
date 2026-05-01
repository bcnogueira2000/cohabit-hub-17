import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) navigate("/", { replace: true }); }, [user, loading, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message); else navigate("/", { replace: true });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Conta criada — já podes entrar."); }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Erro Google: " + (result.error as any)?.message); setBusy(false); return; }
    if (result.redirected) return;
    navigate("/", { replace: true });
  };

  const forgot = async () => {
    if (!email) return toast.error("Insere o email primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de recuperação enviado");
  };

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Living Colours" className="h-14 w-14 object-contain mb-3" />
          <h1 className="font-display text-3xl font-semibold">Living Colours</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operations</p>
        </div>
        <Card className="p-6 border-border/60 shadow-elegant">
          <Tabs defaultValue="signin">
            <TabsList className="w-full grid grid-cols-2 bg-muted/60 rounded-full p-1 mb-5">
              <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-card">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-card">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
                <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
                <Button type="submit" disabled={busy} className="w-full rounded-full gradient-warm border-0 shadow-elegant">Entrar</Button>
              </form>
              <button onClick={forgot} className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground">Esqueci-me da password</button>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
                <div><Label>Password</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
                <Button type="submit" disabled={busy} className="w-full rounded-full gradient-warm border-0 shadow-elegant">Criar conta</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>

          <Button onClick={google} variant="outline" disabled={busy} className="w-full rounded-full">
            Continuar com Google
          </Button>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-5">
          <Link to="/submit" className="hover:text-foreground">És residente? Submeter pedido sem conta →</Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
