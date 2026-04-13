import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FiscalEmit from "@/components/fiscal/FiscalEmit";
import FiscalHistory from "@/components/fiscal/FiscalHistory";
import FiscalSettings from "@/components/fiscal/FiscalSettings";

const Fiscal = () => {
  const [tab, setTab] = useState("emit");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="emit">Emitir Nota</TabsTrigger>
          <TabsTrigger value="history">Histórico Fiscal</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="emit"><FiscalEmit /></TabsContent>
        <TabsContent value="history"><FiscalHistory /></TabsContent>
        <TabsContent value="settings"><FiscalSettings /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Fiscal;
