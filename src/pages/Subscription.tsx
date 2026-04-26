import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle, Loader2, Lock, Clock, ShoppingCart, Package, BarChart3, Printer, LayoutDashboard, Bell, TrendingDown, Tag, X } from "lucide-react";
import { usePricing } from "@/hooks/use-pricing";
import { useTenant } from "@/contexts/TenantContext";
import { PROMO_DURATION_MONTHS, formatPrice } from "@/lib/pricing";

type SubscriptionPageProps = {
  blocked?: boolean;
  tenantName?: string;
  trialExpired?: boolean;
  billingCountryCode?: string | null;
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

const Subscription = ({ blocked = false, tenantName = "Seu Estabelecimento", trialExpired = false, billingCountryCode }: SubscriptionPageProps) => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const pricing = usePricing(billingCountryCode);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    coupon_id: string;
    campaign_id: string | null;
    code: string;
    type: string;
    value: number;
    discount_price?: number;
    normal_price?: number;
    duration_days?: number;
    currency?: string;
  } | null>(null);

  const getDiscountedPrice = () => {
    if (!appliedCoupon) return null;
    if (appliedCoupon.type === "special_offer" && appliedCoupon.discount_price != null) {
      return { price: appliedCoupon.discount_price, currency: appliedCoupon.currency || pricing.currency, duration: appliedCoupon.duration_days };
    }
    if (appliedCoupon.type === "percentage") {
      return { price: pricing.price * (1 - appliedCoupon.value / 100), currency: pricing.currency, duration: null };
    }
    if (appliedCoupon.type === "fixed_amount") {
      return { price: Math.max(0, pricing.price - appliedCoupon.value), currency: pricing.currency, duration: null };
    }
    return null;
  };

  const discounted = getDiscountedPrice();
  const displayedPrice = discounted?.price ?? pricing.price;
  const displayedCurrency = discounted?.currency ?? pricing.currency;

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-coupon", {
        body: { code: couponCode.trim() },
      });
      if (error) throw error;
      if (data?.valid) {
        setAppliedCoupon(data);
        toast.success(`Cupom ${data.code} aplicado!`);
      } else {
        toast.error(data?.error || "Cupom inválido");
      }
    } catch {
      toast.error("Erro ao validar cupom");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          origin: window.location.origin,
          user_id: session.user.id,
          tenant_id: tenantId,
          coupon: appliedCoupon?.code,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Erro ao iniciar checkout");

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
              <img src="/logo.png" alt="YouControl" className="h-12 w-12 object-contain" />
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
            {discounted ? (
              <>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-lg line-through text-muted-foreground">{pricing.label}</span>
                  <span className="text-4xl font-bold text-primary">
                    {formatPrice(discounted.price, discounted.currency)}
                  </span>
                  <span className="text-muted-foreground">{pricing.periodLabel}</span>
                </div>
                {discounted.duration && (
                  <div className="space-y-1 mt-2 p-3 rounded-md bg-primary/5 border border-primary/20">
                    <p className="text-xs font-medium text-primary">
                      🎉 Plano promocional ativo
                    </p>
                    <p className="text-xs text-muted-foreground">Vigência: {PROMO_DURATION_MONTHS} meses</p>
                    <p className="text-xs text-muted-foreground">
                      Reajuste em: {new Date(new Date().setMonth(new Date().getMonth() + PROMO_DURATION_MONTHS)).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-xs font-semibold">
                      Próximo valor: {pricing.label}{pricing.periodLabel}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{appliedCoupon?.code}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={removeCoupon}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">{pricing.label}</span>
                <span className="text-muted-foreground">{pricing.periodLabel}</span>
              </div>
            )}
          </div>

          {/* Coupon field */}
          {!appliedCoupon && (
            <div className="flex gap-2">
              <Input
                placeholder="Cupom promocional"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                className="font-mono"
              />
              <Button variant="outline" onClick={validateCoupon} disabled={couponLoading || !couponCode.trim()}>
                {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>
          )}

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
                Assinar {formatPrice(displayedPrice, displayedCurrency)}
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