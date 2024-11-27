
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { ProfileConfiguration } from "@conformance-test-suite/shared/src/profileConfigurationContract";

interface ProfileConfigurationInfoPanelProps {
    profileConfiguration: ProfileConfiguration;
}

export function ProfileConfigurationInfoPanel({ profileConfiguration }: ProfileConfigurationInfoPanelProps) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{profileConfiguration.name}</CardTitle>
                <CardDescription>Profile Configuration Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div>
                    <h3 className="font-semibold">ID</h3>
                    <p className="text-sm text-muted-foreground">{profileConfiguration.id}</p>
                </div>
                <div>
                    <h3 className="font-semibold">Version</h3>
                    <p className="text-sm text-muted-foreground">{profileConfiguration.description}</p>
                </div>
                </div>
            </CardContent>
        </Card>
    )};