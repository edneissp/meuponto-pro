import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Carlos Mendes",
    role: "Proprietário, Pizzaria Bella Napoli",
    text: "Em menos de uma semana conseguimos organizar o estoque e parar de perder produtos por validade. O sistema é muito intuitivo.",
    rating: 5,
  },
  {
    name: "Fernanda Lima",
    role: "Gerente, Açaí Tropical",
    text: "Conseguimos abrir uma segunda loja em 3 meses porque o controle financeiro ficou transparente. Sabemos exatamente quanto lucramos por unidade.",
    rating: 5,
  },
  {
    name: "Roberto Dias",
    role: "Dono, Restaurante Sabor Caseiro",
    text: "A KDS da cozinha mudou nossa operação. Pedidos não se perdem mais e o tempo de preparo caiu pela metade. Atendimento muito mais rápido.",
    rating: 5,
  },
];

export const TestimonialsSection = () => (
  <section className="py-24 bg-muted/30">
    <div className="container">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">O que dizem quem usa</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Histórias reais de donos de restaurantes que simplificaram sua gestão.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl border border-border bg-card shadow-card hover:shadow-glow/20 hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <Quote className="h-8 w-8 text-primary/40 mb-4" />
            <p className="text-foreground/90 text-sm leading-relaxed mb-6 flex-1">
              "{t.text}"
            </p>
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <div className="pt-4 border-t border-border">
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
