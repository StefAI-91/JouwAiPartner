import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import { testResults } from "@/app/(dashboard)/architectuur/_data/test-results";

export function TestResultsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Test resultaten</CardTitle>
        <CardDescription>Live getest op de preview branch</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {testResults.map((item) => (
            <li key={item.test} className="flex items-start gap-2">
              <span className={`mt-0.5 text-xs ${item.pass ? "text-green-600" : "text-red-500"}`}>
                {item.pass ? "\u2713" : "\u2717"}
              </span>
              <div>
                <span className="text-sm font-medium">{item.test}</span>
                <p className="text-xs text-muted-foreground">{item.result}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
