import { Link } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  comingSoonPt?: string;
  comingSoonEn?: string;
}

export const ComingSoon = ({ icon: Icon, title, description, comingSoonPt, comingSoonEn }: Props) => {
  const { lang } = useLang();
  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-2xl font-semibold mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground mb-5">{description}</p>
      <Card className="p-8 border-dashed text-center">
        <Icon className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground">
          {lang === "pt" ? (comingSoonPt ?? "Em breve.") : (comingSoonEn ?? "Coming soon.")}
        </p>
        <Link to="/app/home" className="text-xs text-primary mt-3 inline-block">← Home</Link>
      </Card>
    </div>
  );
};
