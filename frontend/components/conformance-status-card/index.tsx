import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

interface ConformanceStatusCardProps {
  isConformant: boolean;
  lastTestRun?: {
    createdAt: string;
    updatedAt?: string;
  } | null;
}

export function ConformanceStatusCard({ isConformant, lastTestRun }: ConformanceStatusCardProps) {
  return (
    <Card className={`w-full border-2 ${isConformant ? 'border-green-500' : 'border-red-500'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Conformance Status</span>
          <div className={`flex items-center gap-2 ${
            isConformant ? 'text-green-600' : 'text-red-600'
          }`}>
            {isConformant ? (
              <>
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-medium">Conformant</span>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6" />
                <span className="font-medium">Non-Conformant</span>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {lastTestRun ? (
            <>
              <p className="text-sm text-muted-foreground">
                Last tested: {new Date(lastTestRun.updatedAt || lastTestRun.createdAt).toLocaleString()}
              </p>
              {isConformant && (
                <p className="text-sm text-green-600">
                  This profile configuration has passed all conformance tests.
                </p>
              )}
              {!isConformant && (
                <p className="text-sm text-red-600">
                  This profile configuration has failed one or more conformance tests.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No test runs have been performed yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}