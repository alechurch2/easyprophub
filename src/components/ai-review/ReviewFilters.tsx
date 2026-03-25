import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";
import { ASSETS, TIMEFRAMES } from "./types";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filterAsset: string;
  onFilterAsset: (v: string) => void;
  filterTimeframe: string;
  onFilterTimeframe: (v: string) => void;
  filterStatus: string;
  onFilterStatus: (v: string) => void;
  filterQuality: string;
  onFilterQuality: (v: string) => void;
  sortOrder: "desc" | "asc";
  onSortToggle: () => void;
}

export function ReviewFilters({
  search, onSearchChange,
  filterAsset, onFilterAsset,
  filterTimeframe, onFilterTimeframe,
  filterStatus, onFilterStatus,
  filterQuality, onFilterQuality,
  sortOrder, onSortToggle,
}: Props) {
  return (
    <div className="card-premium p-4 mb-6 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca per asset, tipo richiesta, nota..."
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={onSortToggle}>
          <ArrowUpDown className="h-3 w-3 mr-1" />
          {sortOrder === "desc" ? "Più recenti" : "Meno recenti"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={filterAsset} onValueChange={onFilterAsset}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Asset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli asset</SelectItem>
            {ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTimeframe} onValueChange={onFilterTimeframe}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Timeframe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i TF</SelectItem>
            {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={onFilterStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="completed">Completata</SelectItem>
            <SelectItem value="pending">In attesa</SelectItem>
            <SelectItem value="failed">Fallita</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterQuality} onValueChange={onFilterQuality}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Qualità" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualsiasi</SelectItem>
            <SelectItem value="high">Alta (8-10)</SelectItem>
            <SelectItem value="medium">Media (5-7)</SelectItem>
            <SelectItem value="low">Bassa (1-4)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
