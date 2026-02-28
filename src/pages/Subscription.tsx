import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle, Loader2, Lock } from "lucide-react";

type SubscriptionPageProps = {
  blocked?: boolean;
  tenantName?: string;
};

const Subscription = ({ blocked = false, tenantName = "Seu Estabelecimento" }: SubscriptionPageProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { origin: window.location.origin },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          {blocked ? (
            <div className="flex flex-col items-center gap-3">
              <Lock className="h-12 w-12 text-destructive" />
              <CardTitle className="text-2xl">Acesso Bloqueado</CardTitle>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <CreditCard className="h-12 w-12 text-primary" />
              <CardTitle className="text-2xl">Assinatura MeuPonto Pro</CardTitle>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {blocked && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                Sua assinatura está vencida ou pendente. Realize o pagamento para continuar utilizando o sistema.
              </p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Plano Mensal</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">R$ 50</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </div>

          <ul className="space-y-3">
            {[
              "PDV completo e controle de estoque",
              "Relatórios financeiros detalhados",
              "Gestão de fornecedores e despesas",
              "Personalização da marca",
              "Suporte prioritário",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <Button onClick={handleCheckout} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Pagar com Mercado Pago
              </>
            )}
          </Button>

          {!blocked && (
            <Button variant="ghost" className="w-full" onClick={() => navigate("/app")}>
              Voltar ao Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;
