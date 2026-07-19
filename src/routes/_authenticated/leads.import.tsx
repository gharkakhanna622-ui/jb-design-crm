import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { importLeadsCsv } from "@/lib/leads.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Papa from "papaparse";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/leads/import")({
  head: () => ({ meta: [{ title: "Import leads — Pulse CRM" }] }),
  component: ImportPage,
});

function ImportPage() {
  const fn = useServerFn(importLeadsCsv);
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    inserted: number;
    duplicates: number;
    errorsCount: number;
  } | null>(null);

  function onFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cleaned = (res.data as any[])
          .map((r) => ({
            name: String(r.name ?? r.Name ?? "").trim(),
            mobile: String(r.mobile ?? r.Mobile ?? r.phone ?? r.Phone ?? "").trim(),
            email: String(r.email ?? r.Email ?? "").trim() || undefined,
            business_name:
              String(r.business_name ?? r.business ?? r.Business ?? "").trim() || undefined,
            city: String(r.city ?? r.City ?? "").trim() || undefined,
            notes: String(r.notes ?? r.Notes ?? "").trim() || undefined,
          }))
          .filter((r) => r.name && r.mobile);
        setRows(cleaned);
        toast.success(`Parsed ${cleaned.length} rows`);
      },
      error: (e) => toast.error(e.message),
    });
  }

  async function upload() {
    if (!rows || rows.length === 0) return;
    setLoading(true);
    setProgress({ current: 0, total: rows.length, inserted: 0, duplicates: 0, errorsCount: 0 });

    const chunkSize = 200;
    let totalInserted = 0;
    let totalDuplicates = 0;
    const accumulatedErrors: string[] = [];

    try {
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const res = await fn({ data: { rows: chunk } });

        totalInserted += res.inserted;
        totalDuplicates += res.duplicates;
        if (res.errors && res.errors.length > 0) {
          accumulatedErrors.push(...res.errors);
        }

        setProgress({
          current: Math.min(i + chunkSize, rows.length),
          total: rows.length,
          inserted: totalInserted,
          duplicates: totalDuplicates,
          errorsCount: accumulatedErrors.length,
        });
      }

      toast.success(`${totalInserted} imported · ${totalDuplicates} duplicates skipped`);
      if (accumulatedErrors.length) {
        toast.warning(`${accumulatedErrors.length} errors occurred during import.`);
      }
      console.warn("CSV import errors:", accumulatedErrors);
      navigate({ to: "/leads" });
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Import leads from CSV</h1>
        <p className="text-sm text-muted-foreground">
          Required columns: <code className="rounded bg-muted px-1">name</code>,{" "}
          <code className="rounded bg-muted px-1">mobile</code>. Optional:{" "}
          <code className="rounded bg-muted px-1">email</code>,{" "}
          <code className="rounded bg-muted px-1">business_name</code>,{" "}
          <code className="rounded bg-muted px-1">city</code>,{" "}
          <code className="rounded bg-muted px-1">notes</code>.
        </p>
      </div>
      <Card className="space-y-4 p-6 shadow-card">
        <div className="space-y-1.5">
          <Label>CSV file</Label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="block w-full rounded-md border border-input bg-background p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            disabled={loading}
          />
        </div>
        {rows && !loading && (
          <div className="text-sm text-muted-foreground">
            {rows.length} valid rows ready to import.
          </div>
        )}
        {progress && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Importing leads...</span>
              <span>
                {progress.current} / {progress.total} (
                {Math.round((progress.current / progress.total) * 100)}%)
              </span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} className="h-2" />
            <div className="text-xs text-muted-foreground flex gap-4 mt-1">
              <span>Inserted: {progress.inserted}</span>
              <span>Duplicates: {progress.duplicates}</span>
              {progress.errorsCount > 0 && (
                <span className="text-destructive font-medium">Errors: {progress.errorsCount}</span>
              )}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/leads" })} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={upload} disabled={!rows || rows.length === 0 || loading}>
            {loading ? "Importing…" : `Import ${rows?.length ?? 0} leads`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
