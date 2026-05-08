import { TrendingUp, Users, Clock, Star } from "lucide-react";

const stats = [
  { icon: Clock, value: "5 min", label: "Tempo de implantação", desc: "Comece a vender no mesmo dia" },
  { icon: Users, value: "98%", label: "Taxa de satisfação", desc: "Clientes que recomendam o sistema" },
  { icon: TrendingUp, value: "+30%", label: "Aumento médio", desc: "Na eficiência operacional" },
  { icon: Star, value: "4.9", label: "Avaliação média", desc: "Nota de nossos usuários ativos" },
];

export const SocialProofSection = () => (
  <section className="py-20 bg-background border-y border-border">
    <div className="container">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Resultados que você pode sentir</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Números reais de restaurantes que já transformaram sua operação com o YouControl.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {stats.map((s, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-border bg-card text-center hover:shadow-glow/20 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg gradient-primary mb-4">
              <s.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-3xl md:text-4xl font-extrabold text-gradient mb-1">{s.value}</div>
            <div className="text-sm font-semibold text-foreground mb-1">{s.label}</div>
            <div className="text-xs text-muted-foreground">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
