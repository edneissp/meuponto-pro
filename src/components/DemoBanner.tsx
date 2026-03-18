import { Link } from "react-router-dom";
import { Clock, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DemoBannerProps {
  remainingMinutes: number;
}

const DemoBanner = ({ remainingMinutes }: DemoBannerProps) => {
  const message = remainingMinutes <= 1
    ? "Sua demonstração termina em menos de 1 minuto."
    : `Sua demonstração termina em ${remainingMinutes} minutos.`;

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-accent/40 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3 text-sm">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium">Modo DEMO ativo</p>
          <p className="text-muted-foreground">{message} Os dados exibidos são fictícios e serão reiniciados automaticamente.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground border border-border">
          <Clock className="h-3.5 w-3.5 text-primary" />
          {remainingMinutes} min restantes
        </div>
        <Button size="sm" asChild>
          <Link to="/register?origin=demo">Criar conta grátis</Link>
        </Button>
      </div>
    </div>
  );
};

export default DemoBanner;
