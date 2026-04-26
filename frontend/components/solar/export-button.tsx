"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";

interface Props {
  onExportCSV: () => void;
  onExportPDF: () => void;
  disabled?: boolean;
}

export function ExportButton({ onExportCSV, onExportPDF, disabled }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={disabled} />}>
        <Download className="mr-1.5 h-4 w-4" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
