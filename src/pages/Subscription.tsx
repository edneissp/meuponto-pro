import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle, Loader2, Lock, Clock, ShoppingCart, Package, BarChart3, Printer, LayoutDashboard, Bell, TrendingDown } from "lucide-react";

type SubscriptionPageProps = {
  blocked?: boolean;
  tenantName?: string;
  trialExpired?: boolean;
};

const benefits = [
  { icon: ShoppingCart, text: "PDV completo" },
  { icon: Package, text: "Controle de estoque" },
  { icon: BarChart3, text: "Relatórios automáticos" },
  { icon: Printer, text: "Impressão térmica de pedidos" },
  { icon: LayoutDashboard, text: "Dashboard de vendas" },
  { icon: Clock, text: "Controle de validade de produtos" },
  { icon: TrendingDown, text: "Relatório de estoque baixo" },
];

const Subscription = ({ blocked = false, tenantName = "Seu Estabelecimento", trialExpired = false }: SubscriptionPageProps) => {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          {trialExpired ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Seu período de teste terminou</CardTitle>
            </div>
          ) : blocked ? (
            <div className="flex flex-col items-center gap-3">
              <Lock className="h-12 w-12 text-destructive" />
              <CardTitle className="text-2xl">Acesso Bloqueado</CardTitle>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <CreditCard className="h-12 w-12 text-primary" />
              <CardTitle className="text-2xl">Continue usando o YouControl</CardTitle>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {trialExpired && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                Seu teste grátis de 30 dias chegou ao fim. Assine o plano para continuar gerenciando seu negócio com o YouControl.
              </p>
            </div>
          )}

          {blocked && !trialExpired && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                Sua assinatura está vencida ou pendente. Realize o pagamento para continuar utilizando o sistema.
              </p>
            </div>
          )}

          <p className="text-center text-muted-foreground text-sm">
            Gerencie sua lanchonete, restaurante ou açaiteria com um sistema completo de vendas, estoque e relatórios.
          </p>

          <div className="bg-muted/50 rounded-lg p-6 text-center space-y-2">
            <p className="text-sm font-medium text-primary">YouControl Profissional</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">R$ 99,90</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </div>

          <ul className="space-y-3">
            {benefits.map((item) => (
              <li key={item.text} className="flex items-center gap-3 text-sm">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                {item.text}
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
                Assinar agora
              </>
            )}
          </Button>

          {!blocked && !trialExpired && (
            <Button variant="ghost" className="w-full" onClick={() => navigate("/app")}>
              Voltar ao Dashboard
            </Button>
          )}

          {(blocked || trialExpired) && (
            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              Sair da conta
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;