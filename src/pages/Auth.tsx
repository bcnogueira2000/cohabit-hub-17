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
import { useLang } from "@/lib/i18n";
import logo from "@/assets/logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [room, setRoom] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [busy, setBusy] = useState(false);

  // Once authenticated, decide where to send the user based on roles + status.
  const routeAfterLogin = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles" as any).select("role").eq("user_id", u.id),
      supabase.from("profiles" as any).select("account_status").eq("user_id", u.id).maybeSingle(),
    ]);
    const list = ((roles ?? []) as any[]).map((r) => r.role);
    const isStaff = list.some((r) => ["staff", "manager", "admin"].includes(r));
    const isResident = list.includes("resident");
    if (isStaff) navigate("/", { replace: true });
    else if (isResident) navigate("/app/home", { replace: true });
    else if ((profile as any)?.account_status === "pending_approval")
      navigate("/app/pending-approval", { replace: true });
    else navigate("/app/pending-approval", { replace: true });
  };

  useEffect(() => { if (!loading && user) routeAfterLogin(); /* eslint-disable-next-line */ }, [user, loading]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else routeAfterLogin();
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          phone,
          requested_room_number: room,
          expected_move_in: moveIn || null,
        },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "pt" ? "Conta criada — verifica o email se precisar de confirmação." : "Account created — check your email if confirmation is required.");
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Erro Google: " + (result.error as any)?.message); setBusy(false); return; }
    if (result.redirected) return;
    routeAfterLogin();
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
              <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-card">{t("auth.signin")}</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-card">{t("auth.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3">
                <div><Label>{t("auth.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
                <div><Label>{t("auth.password")}</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
                <Button type="submit" disabled={busy} className="w-full rounded-full gradient-warm border-0 shadow-elegant">{t("auth.signin")}</Button>
              </form>
              <button onClick={forgot} className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground">{t("auth.forgot")}</button>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3">
                <div><Label>{t("auth.fullname")}</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" /></div>
                <div><Label>{t("auth.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
                <div><Label>{t("auth.password")}</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
                <div><Label>{t("auth.phone")}</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>{t("auth.room")}</Label><Input value={room} onChange={(e) => setRoom(e.target.value)} className="mt-1.5" /></div>
                  <div><Label>{t("auth.move_in")}</Label><Input type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} className="mt-1.5" /></div>
                </div>
                <Button type="submit" disabled={busy} className="w-full rounded-full gradient-warm border-0 shadow-elegant">{t("auth.signup")}</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>

          <Button onClick={google} variant="outline" disabled={busy} className="w-full rounded-full">
            {t("auth.google")}
          </Button>
        </Card>

        <div className="flex items-center justify-center gap-3 mt-5 text-xs">
          <Link to="/submit" className="text-muted-foreground hover:text-foreground">És residente sem conta? Submeter pedido →</Link>
        </div>
        <div className="flex justify-center gap-2 pt-3 text-xs">
          <button onClick={() => setLang("pt")} className={lang === "pt" ? "font-semibold" : "text-muted-foreground"}>PT</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={() => setLang("en")} className={lang === "en" ? "font-semibold" : "text-muted-foreground"}>EN</button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
