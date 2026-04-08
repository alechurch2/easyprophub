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
    <div className="card-premium p-3 sm:p-4 mb-4 sm:mb-6 space-y-2.5 sm:space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca..."
          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
        />
        <Button variant="outline" size="sm" onClick={onSortToggle} className="h-8 text-[10px] sm:text-xs px-2 sm:px-3 shrink-0">
          <ArrowUpDown className="h-3 w-3 mr-0.5 sm:mr-1" />
          <span className="hidden sm:inline">{sortOrder === "desc" ? "Più recenti" : "Meno recenti"}</span>
          <span className="sm:hidden">{sortOrder === "desc" ? "Recenti" : "Vecchie"}</span>
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
        <Select value={filterAsset} onValueChange={onFilterAsset}>
          <SelectTrigger className="sm:w-[130px] h-7 sm:h-8 text-[10px] sm:text-xs"><SelectValue placeholder="Asset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            {ASSETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTimeframe} onValueChange={onFilterTimeframe}>
          <SelectTrigger className="sm:w-[120px] h-7 sm:h-8 text-[10px] sm:text-xs"><SelectValue placeholder="TF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti TF</SelectItem>
            {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={onFilterStatus}>
          <SelectTrigger className="sm:w-[120px] h-7 sm:h-8 text-[10px] sm:text-xs"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="completed">Completata</SelectItem>
            <SelectItem value="pending">In attesa</SelectItem>
            <SelectItem value="failed">Fallita</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterQuality} onValueChange={onFilterQuality}>
          <SelectTrigger className="sm:w-[140px] h-7 sm:h-8 text-[10px] sm:text-xs"><SelectValue placeholder="Qualità" /></SelectTrigger>
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
