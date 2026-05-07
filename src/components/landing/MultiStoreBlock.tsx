import { Building2, BarChart3, Users, Globe, Check } from "lucide-react";

const features = [
  { icon: BarChart3, title: "Dashboard consolidado", desc: "Veja vendas, lucro e estoque de todas as lojas em um só lugar." },
  { icon: Globe, title: "Troca rápida de loja", desc: "Alterne entre unidades ou visualize tudo no modo consolidado." },
  { icon: Users, title: "Equipe por loja", desc: "Cada unidade com seus operadores, gerentes e permissões." },
  { icon: Building2, title: "Operação independente", desc: "Produtos, mesas, estoque e financeiro próprios por loja." },
];

export const MultiStoreBlock = () => (
  <section className="py-24 gradient-hero">
    <div className="container">
      <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 mb-6">
            <Building2 className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Multi-loja Premium</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            Gerencie todas as suas lojas <span className="text-gradient">em tempo real</span>
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8">
            Tenha controle total da sua rede. Acompanhe o desempenho de cada unidade ou veja tudo consolidado em um único dashboard.
          </p>
          <ul className="space-y-3">
            {[
              "Visão consolidada de todas as lojas",
              "Indicadores em tempo real por unidade",
              "Equipes e permissões independentes",
              "Estoque e financeiro isolados por loja",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-sm text-primary-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((f, i) => (
            <div key={i} className="p-5 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 backdrop-blur-sm">
              <div className="h-10 w-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-sm font-semibold mb-1 text-primary-foreground">{f.title}</h3>
              <p className="text-xs text-primary-foreground/70">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
