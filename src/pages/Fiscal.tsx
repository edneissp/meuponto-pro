import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FiscalEmit from "@/components/fiscal/FiscalEmit";
import FiscalHistory from "@/components/fiscal/FiscalHistory";
import FiscalSettings from "@/components/fiscal/FiscalSettings";
import FiscalApiConfig from "@/components/fiscal/FiscalApiConfig";

const Fiscal = () => {
  const [tab, setTab] = useState("emit");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="emit">Emitir Nota</TabsTrigger>
          <TabsTrigger value="history">Histórico Fiscal</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="api">Integração API</TabsTrigger>
        </TabsList>

        <TabsContent value="emit"><FiscalEmit /></TabsContent>
        <TabsContent value="history"><FiscalHistory /></TabsContent>
        <TabsContent value="settings"><FiscalSettings /></TabsContent>
        <TabsContent value="api"><FiscalApiConfig /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Fiscal;
