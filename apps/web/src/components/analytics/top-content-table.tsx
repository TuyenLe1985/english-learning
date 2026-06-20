/**
 * TopContentTable — top 10 most-completed content items.
 *
 * UI-SPEC Screen 6: Title truncate max-w-[200px], Module Badge variant secondary,
 * Completions right-aligned. Plain <table> (no shadcn table component available).
 *
 * Data: TopContentItem[] { title: string; module: string; completions: number }
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TopContentItem } from "@repo/shared";

interface TopContentTableProps {
  data: TopContentItem[];
}

export function TopContentTable({ data }: TopContentTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Top Content</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!data || data.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No content completion data available yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Title</th>
                  <th className="px-4 py-2 text-left font-medium">Module</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Completions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr
                    key={`${item.module}-${i}`}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-2">
                      <span
                        className="block max-w-[200px] truncate"
                        title={item.title}
                      >
                        {item.title}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {item.module}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {item.completions.toLocaleString()}
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
