import {
  ShoppingCart, Utensils, ChefHat, Bike, DollarSign,
  Package, FileText, Building2
} from "lucide-react";

const modules = [
  { icon: ShoppingCart, title: "PDV", desc: "Vendas rápidas com combos, descontos e múltiplas formas de pagamento." },
  { icon: Utensils, title: "Mesas", desc: "Controle visual de mesas, comandas e fechamento integrado." },
  { icon: ChefHat, title: "Cozinha (KDS)", desc: "Tela de cozinha em tempo real com timers e prioridade de preparo." },
  { icon: Bike, title: "Delivery", desc: "Pedidos por entrega com taxa por distância e integração WhatsApp." },
  { icon: DollarSign, title: "Financeiro", desc: "Despesas, fiado, fluxo de caixa e relatórios automáticos." },
  { icon: Package, title: "Estoque", desc: "Controle de produtos, validade e alertas em tempo real." },
  { icon: FileText, title: "Fiscal", desc: "Emissão opcional de NF-e e NFC-e via integração Focus NFe." },
  { icon: Building2, title: "Multi-loja", desc: "Gerencie várias unidades com visão consolidada em um só painel." },
];

export const ModulesGrid = () => (
  <section className="py-24">
    <div className="container">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Todos os módulos para operar seu restaurante</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Uma plataforma única e integrada — do PDV ao fiscal, do delivery à gestão multi-loja.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {modules.map((m, i) => (
          <div key={i} className="p-6 rounded-xl border border-border bg-card shadow-card hover:shadow-glow/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <m.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-2">{m.title}</h3>
            <p className="text-sm text-muted-foreground">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
