import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, User as UserIcon, Phone, Shield } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nome demasiado curto").max(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "Telefone inválido")
    .optional()
    .or(z.literal("")),
});

const Profile = () => {
  const { lang, t } = useLang();
  const { signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ full_name: fullName, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    try {
      await update.mutateAsync({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ? parsed.data.phone : null,
      });
      toast.success(lang === "pt" ? "Perfil atualizado" : "Profile updated");
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <Link to="/app/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </Link>

      <h1 className="font-display text-2xl font-semibold">
        {lang === "pt" ? "O meu perfil" : "My profile"}
      </h1>

      <Card className="p-4 border-border/60 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{lang === "pt" ? "Email" : "Email"}:</span>
          <span className="font-medium">{profile?.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{lang === "pt" ? "Estado" : "Status"}:</span>
          <span className="font-medium capitalize">{profile?.account_status?.replace(/_/g, " ")}</span>
        </div>
      </Card>

      <Card className="p-4 border-border/60">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="name" className="flex items-center gap-2">
              <UserIcon className="h-3.5 w-3.5" /> {lang === "pt" ? "Nome" : "Name"}
            </Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> {lang === "pt" ? "Telefone" : "Phone"}
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 ..."
              maxLength={30}
            />
          </div>
          <Button type="submit" className="w-full gradient-warm border-0" disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {lang === "pt" ? "Guardar alterações" : "Save changes"}
          </Button>
        </form>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={async () => {
          await signOut();
        }}
      >
        {lang === "pt" ? "Terminar sessão" : "Sign out"}
      </Button>
    </div>
  );
};

export default Profile;
