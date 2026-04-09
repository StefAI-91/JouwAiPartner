import { Card, CardContent } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { storedDataTables } from "@/app/(dashboard)/architectuur/security/_data/stored-data";

export function StoredDataSection() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Opgeslagen data &amp; PII</h2>
      <div className="space-y-3">
        {storedDataTables.map((table) => (
          <Card key={table.table}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    <code className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {table.table}
                    </code>
                    {table.description}
                  </p>
                  <div className="mt-2 space-y-1">
                    {table.ppiFields.map((field) => (
                      <p key={field} className="text-xs text-muted-foreground">
                        <span className="mr-1.5 text-orange-500">&bull;</span>
                        {field}
                      </p>
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] text-orange-600">
                  {table.retention}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
