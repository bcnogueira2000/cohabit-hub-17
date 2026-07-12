import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import logo from "@/assets/logo.asset.json";
import { Clock } from "lucide-react";

const PendingApproval = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();

  const out = async () => { await signOut(); navigate("/auth", { replace: true }); };

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src={logo.url} alt="Living Colours" className="h-14 w-14 object-contain mb-3" />
          <h1 className="font-display text-2xl font-semibold">Living Colours</h1>
        </div>
        <Card className="p-7 border-border/60 shadow-elegant text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-accent flex items-center justify-center">
            <Clock className="h-6 w-6 text-accent-foreground" />
          </div>
          <h2 className="font-display text-xl font-semibold">{t("pending.title")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("pending.body")}</p>
          <Button onClick={out} variant="outline" className="rounded-full w-full">{t("pending.signout")}</Button>
          <div className="flex justify-center gap-2 pt-2 text-xs">
            <button onClick={() => setLang("pt")} className={lang === "pt" ? "font-semibold" : "text-muted-foreground"}>PT</button>
            <span className="text-muted-foreground">·</span>
            <button onClick={() => setLang("en")} className={lang === "en" ? "font-semibold" : "text-muted-foreground"}>EN</button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PendingApproval;
