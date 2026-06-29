"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton({
  type,
  label,
}: {
  type: "inventory" | "sales" | "cash" | "snapshot";
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const isSnapshot = type === "snapshot";
  const defaultExt = isSnapshot ? "json" : "csv";

  async function handleExport() {
    setLoading(true);
    try {
      const url = isSnapshot ? "/api/export/snapshot" : `/api/export/${type}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        `${type}-export.${defaultExt}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  const buttonLabel = label || (isSnapshot ? "Full Backup" : "Export CSV");

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      <Download className="h-4 w-4 mr-1" />
      {loading ? "Exporting..." : buttonLabel}
    </Button>
  );
}
