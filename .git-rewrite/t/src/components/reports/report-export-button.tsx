"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ReportExportButtonProps {
  section: string;
}

export function ReportExportButton({ section }: ReportExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      // Pass current URL search params so the export respects active filters
      const searchParams = new URLSearchParams(window.location.search);
      const res = await fetch(
        `/api/export/report/${section}?${searchParams.toString()}`
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ||
        `report-${section}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
    >
      <Download className="h-4 w-4 mr-1" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
