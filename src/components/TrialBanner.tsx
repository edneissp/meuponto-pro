import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialBannerProps {
  daysLeft: number;
}

const TrialBanner = ({ daysLeft }: TrialBannerProps) => {
  const isUrgent = daysLeft <= 3;
  const message = daysLeft === 0
    ? "Seu teste grátis do YouControl termina hoje!"
    : daysLeft === 1
      ? "Seu teste grátis do YouControl termina amanhã!"
      : `Seu teste grátis do YouControl termina em ${daysLeft} dias.`;

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
      isUrgent
        ? "bg-destructive/10 border-b border-destructive/20 text-destructive"
        : "bg-primary/10 border-b border-primary/20 text-primary"
    }`}>
      <div className="flex items-center gap-2">
        {isUrgent ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <span className="font-medium">{message}</span>
        <span className="hidden sm:inline text-muted-foreground">Assine o plano para continuar usando o sistema.</span>
      </div>
      <Button size="sm" variant={isUrgent ? "destructive" : "default"} asChild>
        <Link to="/app/subscription">Assinar agora</Link>
      </Button>
    </div>
  );
};

export default TrialBanner;