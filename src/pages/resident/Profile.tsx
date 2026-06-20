import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  Mail,
  User as UserIcon,
  Phone,
  Shield,
  Globe,
  Heart,
  Briefcase,
  ImageIcon,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useProfile, useUpdateProfile, type ProfileUpdate } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { ResidentFileUpload } from "@/components/ResidentFileUpload";
import { ICON_STROKE } from "@/lib/residentLabels";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nome demasiado curto").max(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "Telefone inválido")
    .optional()
    .or(z.literal("")),
  nationality: z.string().trim().max(80).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().trim().max(40).optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  emergency_contact_phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "Telefone inválido")
    .optional()
    .or(z.literal("")),
  employer_or_school: z.string().trim().max(200).optional().or(z.literal("")),
  alternate_address: z.string().trim().max(300).optional().or(z.literal("")),
  special_needs: z.string().trim().max(2000).optional().or(z.literal("")),
  iban: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Z0-9 ]*$/i, "IBAN inválido")
    .optional()
    .or(z.literal("")),
});

const emptyToNull = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

const GENDER_OPTIONS: { value: string; pt: string; en: string }[] = [
  { value: "female", pt: "Feminino", en: "Female" },
  { value: "male", pt: "Masculino", en: "Male" },
  { value: "non_binary", pt: "Não-binário", en: "Non-binary" },
  { value: "other", pt: "Outro", en: "Other" },
  { value: "prefer_not_to_say", pt: "Prefiro não dizer", en: "Prefer not to say" },
];

const Profile = () => {
  const { lang, t } = useLang();
  const { signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    nationality: "",
    date_of_birth: "",
    gender: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    employer_or_school: "",
    alternate_address: "",
    special_needs: "",
    iban: "",
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        nationality: profile.nationality ?? "",
        date_of_birth: profile.date_of_birth ?? "",
        gender: profile.gender ?? "",
        emergency_contact_name: profile.emergency_contact_name ?? "",
        emergency_contact_phone: profile.emergency_contact_phone ?? "",
        employer_or_school: profile.employer_or_school ?? "",
        alternate_address: profile.alternate_address ?? "",
        special_needs: profile.special_needs ?? "",
        iban: profile.iban ?? "",
      });
      setPhotoUrl(profile.photo_url ?? null);
      setDocumentUrl(profile.document_url ?? null);
    }
  }, [profile]);

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    const d = parsed.data;
    const payload: ProfileUpdate = {
      full_name: d.full_name,
      phone: emptyToNull(d.phone),
      nationality: emptyToNull(d.nationality),
      date_of_birth: emptyToNull(d.date_of_birth),
      gender: emptyToNull(d.gender),
      emergency_contact_name: emptyToNull(d.emergency_contact_name),
      emergency_contact_phone: emptyToNull(d.emergency_contact_phone),
      employer_or_school: emptyToNull(d.employer_or_school),
      alternate_address: emptyToNull(d.alternate_address),
      special_needs: emptyToNull(d.special_needs),
      iban: emptyToNull(d.iban),
      photo_url: photoUrl,
      document_url: documentUrl,
    };
    try {
      await update.mutateAsync(payload);
      toast.success(lang === "pt" ? "Perfil atualizado" : "Profile updated");
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  const persistFile = async (field: "photo_url" | "document_url", value: string | null) => {
    try {
      await update.mutateAsync({ [field]: value } as ProfileUpdate);
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={ICON_STROKE} /> {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <Link to="/app/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} /> {t("common.back")}
      </Link>

      <h1 className="font-display text-2xl font-semibold">
        {lang === "pt" ? "O meu perfil" : "My profile"}
      </h1>

      <Card className="p-4 border-border/60 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" strokeWidth={ICON_STROKE} />
          <span className="text-muted-foreground">{lang === "pt" ? "Email" : "Email"}:</span>
          <span className="font-medium">{profile?.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground" strokeWidth={ICON_STROKE} />
          <span className="text-muted-foreground">{lang === "pt" ? "Estado" : "Status"}:</span>
          <span className="font-medium capitalize">{profile?.account_status?.replace(/_/g, " ")}</span>
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-4">
        <Card className="p-4 border-border/60 space-y-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Identificação" : "Identification"}
          </h2>
          <div>
            <Label htmlFor="name">{lang === "pt" ? "Nome" : "Name"}</Label>
            <Input
              id="name"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Telefone" : "Phone"}
            </Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+351 ..."
              maxLength={30}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Fotografia de perfil" : "Profile photo"}
              </Label>
              <ResidentFileUpload
                path={photoUrl}
                onChange={(p) => {
                  setPhotoUrl(p);
                  persistFile("photo_url", p);
                }}
                accept="image"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Documento de identificação (PDF)" : "ID document (PDF)"}
              </Label>
              <ResidentFileUpload
                path={documentUrl}
                onChange={(p) => {
                  setDocumentUrl(p);
                  persistFile("document_url", p);
                }}
                accept="pdf"
                className="mt-2"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/60 space-y-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Pessoal" : "Personal"}
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="nationality">{lang === "pt" ? "Nacionalidade" : "Nationality"}</Label>
              <Input
                id="nationality"
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="dob">{lang === "pt" ? "Data de nascimento" : "Date of birth"}</Label>
              <Input
                id="dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set("date_of_birth", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="gender">{lang === "pt" ? "Sexo" : "Gender"}</Label>
              <Select value={form.gender || undefined} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder={lang === "pt" ? "Seleciona…" : "Select…"} />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {lang === "pt" ? o.pt : o.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/60 space-y-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Contacto de emergência" : "Emergency contact"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="emg_name">{lang === "pt" ? "Nome" : "Name"}</Label>
              <Input
                id="emg_name"
                value={form.emergency_contact_name}
                onChange={(e) => set("emergency_contact_name", e.target.value)}
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="emg_phone">{lang === "pt" ? "Telefone" : "Phone"}</Label>
              <Input
                id="emg_phone"
                value={form.emergency_contact_phone}
                onChange={(e) => set("emergency_contact_phone", e.target.value)}
                placeholder="+351 ..."
                maxLength={30}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border/60 space-y-4">
          <h2 className="font-display font-semibold text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" strokeWidth={ICON_STROKE} /> {lang === "pt" ? "Outros" : "Other"}
          </h2>
          <div>
            <Label htmlFor="emp">
              {lang === "pt" ? "Faculdade / Empregador" : "School / Employer"}
            </Label>
            <Input
              id="emp"
              value={form.employer_or_school}
              onChange={(e) => set("employer_or_school", e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="alt_addr">
              {lang === "pt" ? "Morada alternativa (pós-estadia)" : "Alternate address (post-stay)"}
            </Label>
            <Input
              id="alt_addr"
              value={form.alternate_address}
              onChange={(e) => set("alternate_address", e.target.value)}
              maxLength={300}
            />
          </div>
          <div>
            <Label htmlFor="special">
              {lang === "pt"
                ? "Necessidades especiais a comunicar à equipa"
                : "Special needs to share with the team"}
            </Label>
            <Textarea
              id="special"
              value={form.special_needs}
              onChange={(e) => set("special_needs", e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={
                lang === "pt"
                  ? "Alergias, mobilidade, dieta, etc. Texto livre."
                  : "Allergies, mobility, diet, etc. Free text."
              }
            />
          </div>
          <div>
            <Label htmlFor="iban">
              {lang === "pt" ? "IBAN (para caução / débito direto)" : "IBAN (for deposit / direct debit)"}
            </Label>
            <Input
              id="iban"
              value={form.iban}
              onChange={(e) => set("iban", e.target.value.toUpperCase())}
              maxLength={40}
              placeholder="PT50 ..."
            />
          </div>
        </Card>

        <Button type="submit" className="w-full gradient-warm border-0" disabled={update.isPending}>
          {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" strokeWidth={ICON_STROKE} />}
          {lang === "pt" ? "Guardar alterações" : "Save changes"}
        </Button>
      </form>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full">
            {lang === "pt" ? "Terminar sessão" : "Sign out"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "pt" ? "Tens a certeza que queres sair?" : "Are you sure you want to sign out?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "pt"
                ? "Vais ter de fazer login novamente para voltar a aceder."
                : "You'll need to sign in again to access the app."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "pt" ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOut()}>
              {lang === "pt" ? "Sair" : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
