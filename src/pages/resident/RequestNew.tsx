import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Wrench, Sparkles, Wifi, Search, Package, MessageSquare, Loader2, Home as HomeIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateRequest,
  type RequestCategory,
  type RequestPriority,
  type PermissionToEnter,
} from "@/hooks/useResidentRequests";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const categoryOptions: {
  value: RequestCategory;
  icon: React.ComponentType<{ className?: string }>;
  pt: string;
  en: string;
}[] = [
  { value: "maintenance", icon: Wrench, pt: "Manutenção", en: "Maintenance" },
  { value: "cleaning", icon: Sparkles, pt: "Limpeza", en: "Cleaning" },
  { value: "wifi_tech", icon: Wifi, pt: "Wi-Fi / Tech", en: "Wi-Fi / Tech" },
  { value: "lost_found", icon: Search, pt: "Lost & Found", en: "Lost & Found" },
  { value: "consumables", icon: Package, pt: "Consumíveis", en: "Consumables" },
  { value: "other", icon: MessageSquare, pt: "Outro", en: "Other" },
];

const RequestNew = () => {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const create = useCreateRequest();

  const [category, setCategory] = useState<RequestCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("medium");
  const [permission, setPermission] = useState<PermissionToEnter>("yes");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast.error(lang === "pt" ? "Escolhe uma categoria" : "Pick a category");
      return;
    }
    if (!title.trim()) {
      toast.error(lang === "pt" ? "Adiciona um título" : "Add a title");
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        location: location.trim() || undefined,
        permission_to_enter: permission,
      });
      toast.success(lang === "pt" ? "Pedido enviado!" : "Request sent!");
      navigate("/app/requests");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  return (
    <div className="px-4 py-6 space-y-5">
      <Link to="/app/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </Link>

      <h1 className="font-display text-2xl font-semibold">{t("home.new_request")}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label className="mb-2 block">
            {lang === "pt" ? "Categoria" : "Category"}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {categoryOptions.map(({ value, icon: Icon, pt, en }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-smooth",
                  category === value
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border/60 bg-card hover:border-border",
                )}
              >
                <Icon className={cn("h-5 w-5", category === value ? "text-primary" : "text-muted-foreground")} />
                <span className="text-[11px] font-medium text-center leading-tight">
                  {lang === "pt" ? pt : en}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="title">{lang === "pt" ? "Título" : "Title"} *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={lang === "pt" ? "Ex: Torneira a pingar" : "e.g. Leaking tap"}
            required
            maxLength={120}
          />
        </div>

        <div>
          <Label htmlFor="description">{lang === "pt" ? "Descrição" : "Description"}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={lang === "pt" ? "Detalhes adicionais…" : "More details…"}
            rows={4}
          />
        </div>

        <div>
          <Label htmlFor="location">{lang === "pt" ? "Localização" : "Location"}</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={lang === "pt" ? "Quarto, casa de banho, cozinha…" : "Room, bathroom, kitchen…"}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {lang === "pt"
              ? "Por defeito é o teu quarto. Indica outro local se aplicável."
              : "Defaults to your room. Specify if elsewhere."}
          </p>
        </div>

        <div>
          <Label className="mb-2 block">{lang === "pt" ? "Prioridade" : "Priority"}</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as RequestPriority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "py-2.5 rounded-lg border text-sm font-medium capitalize transition-smooth",
                  priority === p
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {p === "low" ? (lang === "pt" ? "Baixa" : "Low") :
                 p === "medium" ? (lang === "pt" ? "Média" : "Medium") :
                 (lang === "pt" ? "Alta" : "High")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">
            {lang === "pt" ? "Permissão para entrar no quarto" : "Permission to enter room"}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { v: "yes" as PermissionToEnter, pt: "Sim", en: "Yes" },
                { v: "with_notice" as PermissionToEnter, pt: "Com aviso", en: "With notice" },
                { v: "no" as PermissionToEnter, pt: "Não", en: "No" },
              ]
            ).map(({ v, pt, en }) => (
              <button
                key={v}
                type="button"
                onClick={() => setPermission(v)}
                className={cn(
                  "py-2.5 rounded-lg border text-sm font-medium transition-smooth",
                  permission === v
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {lang === "pt" ? pt : en}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full gradient-warm border-0"
          disabled={create.isPending}
        >
          {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("common.submit")}
        </Button>
      </form>
    </div>
  );
};

export default RequestNew;
