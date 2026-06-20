/**
 * ModuleCompletionTable — per-module average completion rate table.
 *
 * ANLT-02: "average completion rates by module" — rows over completionRateByModule
 * { module, rate } with Module Badge + right-aligned percentage.
 *
 * Data: CompletionRateByModule[] { module: string; rate: number (0.0–1.0) }
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CompletionRateByModule } from "@repo/shared";

interface ModuleCompletionTableProps {
  data: CompletionRateByModule[];
}

function RateBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[80px]">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-sm font-medium w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}

export function ModuleCompletionTable({ data }: ModuleCompletionTableProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Module Completion Rates
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!data || data.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No module completion data available yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Module</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Avg. Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr
                    key={item.module}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {item.module}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <RateBar rate={item.rate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
