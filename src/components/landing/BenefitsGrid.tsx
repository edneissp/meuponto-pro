import {
  ShoppingCart, Package, Utensils, ChefHat, DollarSign,
  Receipt, FileText, MessageCircle
} from "lucide-react";

const benefits = [
  { icon: ShoppingCart, title: "PDV Inteligente", desc: "Vendas rápidas com combos, descontos e múltiplas formas de pagamento." },
  { icon: Package, title: "Controle de Estoque", desc: "Alertas automáticos de validade e estoque baixo em tempo real." },
  { icon: Utensils, title: "Gestão de Mesas", desc: "Controle profissional de mesas, pedidos e fechamento integrado." },
  { icon: ChefHat, title: "KDS Cozinha", desc: "Tela de cozinha em tempo real para agilizar o preparo dos pedidos." },
  { icon: DollarSign, title: "Financeiro Completo", desc: "Despesas, fornecedores, fluxo de caixa e relatórios automáticos." },
  { icon: Receipt, title: "Fiado Profissional", desc: "Controle de vendas a prazo integrado ao contas a receber." },
  { icon: FileText, title: "NF-e e NFC-e", desc: "Emissão fiscal integrada com histórico completo e download de XML/PDF." },
  { icon: MessageCircle, title: "Cardápio + WhatsApp", desc: "Cardápio digital com pedidos diretos e atendimento pelo WhatsApp." },
];

export const BenefitsGrid = () => (
  <section className="py-24">
    <div className="container">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que seu comércio precisa em um só lugar</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Plataforma completa para restaurantes, lanchonetes e comércios de qualquer porte.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {benefits.map((b, i) => (
          <div key={i} className="p-6 rounded-xl border border-border bg-card shadow-card hover:shadow-glow/20 hover:-translate-y-1 transition-all duration-300 group">
            <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <b.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-2">{b.title}</h3>
            <p className="text-sm text-muted-foreground">{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
