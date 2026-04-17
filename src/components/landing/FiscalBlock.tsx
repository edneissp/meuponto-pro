import { FileText, History, Download, ShieldCheck, Check } from "lucide-react";

const fiscalFeatures = [
  { icon: FileText, title: "Nota Fiscal Integrada", desc: "Emita NF-e e NFC-e direto do PDV com poucos cliques." },
  { icon: History, title: "Histórico Fiscal Completo", desc: "Consulte, filtre e reimprima todas as notas emitidas." },
  { icon: Download, title: "Download XML e PDF", desc: "Baixe os arquivos fiscais a qualquer momento, prontos para a contabilidade." },
  { icon: ShieldCheck, title: "Conformidade SEFAZ", desc: "Integração homologada com transmissão segura e rastreável." },
];

export const FiscalBlock = () => (
  <section className="py-24 bg-muted/50">
    <div className="container">
      <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Módulo Fiscal</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Emita <span className="text-gradient">NF-e e NFC-e</span> sem complicação
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Sistema fiscal integrado ao PDV. Emita, consulte e gerencie todas as suas notas com total segurança e conformidade.
          </p>
          <ul className="space-y-3">
            {[
              "Emissão direta do PDV",
              "Histórico fiscal organizado",
              "Download de XML e PDF",
              "Cancelamento de notas",
              "Multi-tenant e seguro",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {fiscalFeatures.map((f, i) => (
            <div key={i} className="p-5 rounded-xl border border-border bg-card shadow-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
