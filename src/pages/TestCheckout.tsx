import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, CreditCard, Loader2 } from "lucide-react";

type CheckoutResponse = {
  status?: string;
  init_point?: string;
  sandbox_init_point?: string;
  preference_id?: string;
  amount?: number;
  plan_type?: string;
  coupon_used?: string;
  error?: string;
  details?: unknown;
};

const TestCheckout = () => {
  const [searchParams] = useSearchParams();
  const returnedStatus = searchParams.get("status");
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState("Aguardando clique");
  const [response, setResponse] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    setResponse(null);
    setRequestStatus("Criando preferência no Mercado Pago...");

    try {
      const apiResponse = await fetch("/api/test-mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = (await apiResponse.json().catch(() => null)) as CheckoutResponse | null;

      if (!apiResponse.ok) throw new Error(data?.error || `Erro HTTP ${apiResponse.status}`);
      if (!data?.init_point) throw new Error(data?.error || "init_point não retornado");

      setResponse(data);
      setRequestStatus("Preferência criada. Redirecionando...");
      window.location.href = data.init_point;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
      setRequestStatus("Erro na criação da preferência");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl items-center justify-center">
        <Card className="w-full">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Teste Checkout Mercado Pago</CardTitle>
              <Badge variant={error ? "destructive" : "secondary"}>{requestStatus}</Badge>
            </div>
            {returnedStatus && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-3 text-sm">
                <CheckCircle className="h-4 w-4 text-success" />
                Retorno do checkout: <strong>{returnedStatus}</strong>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-md border border-border bg-muted/50 p-4">
              <p className="text-sm font-medium">Payload de teste com cupom</p>
              <pre className="mt-3 overflow-x-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
{JSON.stringify({ title: "Plano SouEFI", price: 69.9, quantity: 1, coupon: "Primeiros100", plan_type: "promo" }, null, 2)}
              </pre>
            </div>

            <Button onClick={handleCheckout} disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Pagar com Mercado Pago
            </Button>

            <div className="space-y-3 rounded-md border border-border p-4">
              <p className="text-sm font-medium">Debug visual</p>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Status:</span> {requestStatus}</p>
                <p><span className="text-muted-foreground">Valor:</span> {response?.amount ? `R$ ${response.amount.toFixed(2).replace(".", ",")}` : "—"}</p>
                <p><span className="text-muted-foreground">Cupom:</span> {response?.coupon_used || "—"}</p>
                <p className="break-all"><span className="text-muted-foreground">init_point:</span> {response?.init_point || "—"}</p>
                <p className="break-all"><span className="text-muted-foreground">preference_id:</span> {response?.preference_id || "—"}</p>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              )}
              {response && (
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
{JSON.stringify(response, null, 2)}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default TestCheckout;