import { Link } from "react-router-dom";
import { Clock3, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DemoExpired = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg p-8 text-center shadow-card">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock3 className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Seu tempo de demonstração terminou</h1>
        <p className="text-muted-foreground mb-6">
          Gostou do sistema? Crie sua conta agora e comece um trial real de 30 dias com seu próprio ambiente.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link to="/register?origin=demo">
              <UserPlus className="mr-2 h-4 w-4" />
              Criar conta grátis por 30 dias
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/">Voltar ao site</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DemoExpired;
