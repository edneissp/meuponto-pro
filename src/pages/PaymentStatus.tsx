import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";

const PaymentStatus = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  useEffect(() => {
    if (status === "approved") {
      toast.success("Pagamento aprovado! Seu acesso foi liberado.");
      // Wait a moment for webhook to process, then redirect
      setTimeout(() => navigate("/app"), 3000);
    }
  }, [status, navigate]);

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Pagamento Aprovado!</h2>
            <p className="text-muted-foreground">Seu acesso foi liberado. Redirecionando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Pagamento Recusado</h2>
            <p className="text-muted-foreground">Tente novamente com outra forma de pagamento.</p>
            <Button onClick={() => navigate("/app/subscription")}>Tentar Novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <Clock className="h-16 w-16 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-bold">Pagamento Pendente</h2>
          <p className="text-muted-foreground">Estamos aguardando a confirmação do seu pagamento.</p>
          <Button variant="outline" onClick={() => navigate("/app")}>Voltar ao App</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStatus;
