
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { System } from "@conformance-test-suite/shared/src/systemContract";

interface SystemInfoPanelProps {
    system: System;
}

export function SystemInfoPanel({ system }: SystemInfoPanelProps) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{system.name}</CardTitle>
                <CardDescription>System Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div>
                    <h3 className="font-semibold">ID</h3>
                    <p className="text-sm text-muted-foreground">{system.id}</p>
                </div>
                <div>
                    <h3 className="font-semibold">Version</h3>
                    <p className="text-sm text-muted-foreground">{system.version}</p>
                </div>
                <div>
                    <h3 className="font-semibold">Endpoint</h3>
                    <p className="text-sm text-muted-foreground">{system.endpoint}</p>
                </div>
                <div>
                    <h3 className="font-semibold">Description</h3>
                    <p className="text-sm text-muted-foreground">{system.description}</p>
                </div>
                </div>
            </CardContent>
        </Card>
    )};