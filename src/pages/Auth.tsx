import { useState, useEffect } from "react";
import { NationalitySelect, PhoneInput, NationalityFormField, PhoneFormField } from "@/components/CountryFields";
import { useNavigate } from "react-router-dom";
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
    else {
      // Closed app: accounts without an assigned role are not allowed in.
      await supabase.auth.signOut();
      toast.error(lang === "pt"
        ? "Acesso reservado à equipa Living Colours. Contacta a gestão para teres acesso."
        : "Access restricted to the Living Colours team. Contact management for access.");
    }
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
          <p className="text-sm text-muted-foreground mt-1">{lang === "pt" ? "Bem-vindo a casa" : "Welcome home"}</p>
        </div>
        <Card className="p-6 border-border/60 shadow-elegant">
          <form onSubmit={signIn} className="space-y-3">
            <div><Label>{t("auth.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
            <div><Label>{t("auth.password")}</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" /></div>
            <Button type="submit" disabled={busy} className="w-full">{t("auth.signin")}</Button>
          </form>
          <button onClick={forgot} className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground">{t("auth.forgot")}</button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {lang === "pt" ? "Acesso reservado à equipa e residentes Living Colours." : "Access restricted to Living Colours team and residents."}
          </p>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>

          <Button onClick={google} variant="outline" disabled={busy} className="w-full">
            {t("auth.google")}
          </Button>
        </Card>

        <div className="flex justify-center gap-2 pt-5 text-xs">
          <button onClick={() => setLang("pt")} className={lang === "pt" ? "font-semibold" : "text-muted-foreground"}>PT</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={() => setLang("en")} className={lang === "en" ? "font-semibold" : "text-muted-foreground"}>EN</button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
