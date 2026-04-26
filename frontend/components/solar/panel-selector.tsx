"use client";

import { cn } from "@/lib/utils";
import type { Panel } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Props {
  panels: Panel[];
  selected: Panel | null;
  onSelect: (panel: Panel) => void;
}

export function PanelSelector({ panels, selected, onSelect }: Props) {
  if (panels.length <= 1) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {panels.map((p) => (
        <Button
          key={p.id}
          variant={selected?.id === p.id ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(p)}
          className={cn("transition-all", selected?.id === p.id && "shadow-sm")}
        >
          {p.name}
        </Button>
      ))}
    </div>
  );
}
