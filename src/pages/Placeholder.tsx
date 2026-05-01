import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";

const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
    <h1 className="font-display text-3xl lg:text-4xl font-semibold mb-2">{title}</h1>
    <p className="text-muted-foreground mb-6">{description}</p>
    <Card className="p-12 text-center border-dashed border-border/60">
      <Construction className="h-10 w-10 mx-auto text-primary/60 mb-3" />
      <h3 className="font-display text-xl font-semibold mb-1">Em construção</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Este módulo faz parte do MVP e será construído nas próximas iterações. A fundação e o sistema de design já estão prontos.
      </p>
    </Card>
  </div>
);

export default Placeholder;
