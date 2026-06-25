import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  User as UserIcon,
  BedDouble,
  CalendarRange,
  Inbox,
  KeyRound,
  Globe,
  HelpCircle,
  BookOpen,
  Info,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/lib/i18n";
import { ICON_STROKE, residentStatusLabels, residentStatusBadgeClass } from "@/lib/residentLabels";
import { useMyStay } from "@/hooks/useMyStay";
import { cn } from "@/lib/utils";

type Row = {
  to?: string;
  onClick?: () => void;
  icon: LucideIcon;
  label: string;
  trailing?: React.ReactNode;
};

const AccountRow = ({ row }: { row: Row }) => {
  const content = (
    <div className="flex items-center gap-3 py-3.5">
      <div className="h-10 w-10 rounded-full bg-muted/70 flex items-center justify-center shrink-0">
        <row.icon className="h-4 w-4 text-foreground/80" strokeWidth={ICON_STROKE} />
      </div>
      <span className="flex-1 text-sm font-medium">{row.label}</span>
      {row.trailing ?? (
        <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={ICON_STROKE} />
      )}
    </div>
  );
  if (row.to) {
    return (
      <Link to={row.to} className="block hover:bg-muted/30 -mx-4 px-4 transition-colors">
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={row.onClick}
      className="w-full text-left block hover:bg-muted/30 -mx-4 px-4 transition-colors"
    >
      {content}
    </button>
  );
};

const Account = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { lang, setLang } = useLang();
  const { data: stay } = useMyStay();
  const [resetting, setResetting] = useState(false);

  const residentStatus = stay?.resident?.status;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const handleChangePassword = async () => {
    if (!profile?.email) return;
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(
        lang === "pt"
          ? "Enviámos um email para alterares a tua password."
          : "We've sent you an email to change your password.",
      );
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    } finally {
      setResetting(false);
    }
  };

  const personal: Row[] = [
    {
      to: "/app/profile",
      icon: UserIcon,
      label: lang === "pt" ? "Informação pessoal" : "Personal information",
    },
    {
      to: "/app/my-stay",
      icon: BedDouble,
      label: lang === "pt" ? "A minha estadia" : "My stay",
    },
    {
      to: "/app/bookings",
      icon: CalendarRange,
      label: lang === "pt" ? "Reservas" : "Bookings",
    },
    {
      to: "/app/requests",
      icon: Inbox,
      label: lang === "pt" ? "Pedidos" : "Requests",
    },
  ];

  const preferences: Row[] = [
    {
      onClick: handleChangePassword,
      icon: KeyRound,
      label: lang === "pt" ? "Alterar password" : "Change password",
    },
    {
      onClick: () => setLang(lang === "pt" ? "en" : "pt"),
      icon: Globe,
      label: lang === "pt" ? "Idioma" : "Language",
      trailing: (
        <span className="text-sm text-muted-foreground">
          {lang === "pt" ? "Português" : "English"}
        </span>
      ),
    },
  ];

  const help: Row[] = [
    {
      to: "/app/onboarding",
      icon: BookOpen,
      label: "Onboarding",
    },
    {
      to: "/app/faqs",
      icon: HelpCircle,
      label: lang === "pt" ? "Ajuda & suporte" : "Help & support",
    },
    {
      to: "/app/faqs",
      icon: Info,
      label: lang === "pt" ? "Sobre a app" : "About app",
    },
  ];

  const Section = ({ rows }: { rows: Row[] }) => (
    <Card className="p-0 border-border/60 overflow-hidden">
      <div className="px-4 divide-y divide-border/60">
        {rows.map((r, i) => (
          <AccountRow key={i} row={r} />
        ))}
      </div>
    </Card>
  );

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/app/home"
          aria-label={lang === "pt" ? "Voltar" : "Back"}
          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} />
        </Link>
        <h1 className="font-display text-base font-semibold">
          {lang === "pt" ? "A minha conta" : "My account"}
        </h1>
        <div className="h-9 w-9" />
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <BrandAvatar name={profile?.full_name} src={profile?.photo_url} size="lg" className="h-20 w-20 text-xl" />
        <div className="text-center space-y-1">
          <div className="font-display text-xl font-semibold">{profile?.full_name}</div>
          <div className="text-xs text-muted-foreground">{profile?.email}</div>
        </div>
        <div className="flex items-center gap-2">
          {residentStatus && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                residentStatusBadgeClass[residentStatus],
              )}
            >
              {residentStatusLabels[residentStatus][lang as "pt" | "en"]}
            </span>
          )}
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="rounded-full h-7 px-3 text-xs bg-muted/70 hover:bg-muted"
          >
            <Link to="/app/profile">{lang === "pt" ? "Editar perfil" : "Edit profile"}</Link>
          </Button>
        </div>
      </div>

      <Section rows={personal} />
      <Section rows={preferences} />
      <Section rows={help} />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-12 rounded-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4 mr-2" strokeWidth={ICON_STROKE} />
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
                ? "Vais ter de fazer login novamente para voltar à app."
                : "You'll need to log in again to come back."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "pt" ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>
              {lang === "pt" ? "Sair" : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {resetting && <div className="sr-only">…</div>}
    </div>
  );
};

export default Account;
