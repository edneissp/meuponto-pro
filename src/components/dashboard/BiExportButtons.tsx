import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface BiExportButtonsProps {
  onExport: (format: "pdf" | "excel" | "csv") => void;
}

const BiExportButtons = ({ onExport }: BiExportButtonsProps) => {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => onExport("pdf")}>
        <FileDown className="h-4 w-4 mr-1" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => onExport("excel")}>
        <FileDown className="h-4 w-4 mr-1" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => onExport("csv")}>
        <FileDown className="h-4 w-4 mr-1" /> CSV
      </Button>
    </div>
  );
};

export default BiExportButtons;
