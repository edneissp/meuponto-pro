import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type FilterPreset = "today" | "7d" | "30d" | "month" | "custom";

interface BiFilterBarProps {
  preset: FilterPreset;
  onPresetChange: (p: FilterPreset) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (r: { from: Date; to: Date }) => void;
}

const presets: { value: FilterPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "custom", label: "Personalizado" },
];

const BiFilterBar = ({ preset, onPresetChange, dateRange, onDateRangeChange }: BiFilterBarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.value}
          variant={preset === p.value ? "default" : "outline"}
          size="sm"
          onClick={() => onPresetChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(d) => d && onDateRangeChange({ ...dateRange, from: d })}
                disabled={(date) => date > new Date()}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.to, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(d) => d && onDateRangeChange({ ...dateRange, to: d })}
                disabled={(date) => date > new Date()}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default BiFilterBar;
