import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Tag, Copy } from "lucide-react";
import { toast } from "sonner";

const pricingFeatures = [
  "PDV completo + cardápio digital",
  "Controle de estoque com alertas",
  "Gestão de mesas + KDS Cozinha",
  "Financeiro, fiado e fornecedores",
  "Emissão de NF-e e NFC-e",
  "Relatórios e dashboard inteligente",
  "Atendimento via WhatsApp",
  "Suporte dedicado",
];

export const PricingBlock = () => {
  const copyCoupon = () => {
    navigator.clipboard.writeText("PRIMEIROS100");
    toast.success("Cupom copiado: PRIMEIROS100");
  };

  return (
    <section id="pricing" className="py-24">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Preço simples e transparente</h2>
          <p className="text-muted-foreground text-lg">Sistema completo. Sem surpresas. Sem fidelidade.</p>
        </div>
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-glow relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-bl-xl">
              OFERTA LIMITADA
            </div>
            <div className="text-center mb-6 mt-4">
              <h3 className="text-xl font-bold mb-1">YouControl Profissional</h3>
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Teste grátis por 30 dias
              </div>
              <div className="flex items-baseline justify-center gap-2 mb-1">
                <span className="text-2xl text-muted-foreground line-through">R$ 69,90</span>
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold text-gradient">R$ 39,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">por 12 meses para os 100 primeiros clientes</p>
            </div>

            <button
              onClick={copyCoupon}
              className="w-full mb-6 p-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Use o cupom:</span>
                <span className="font-bold text-primary text-sm">PRIMEIROS100</span>
              </div>
              <Copy className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            </button>

            <ul className="space-y-3 mb-8">
              {pricingFeatures.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full" size="lg" asChild>
              <Link to="/register">Teste grátis agora</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Sem fidelidade • Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
