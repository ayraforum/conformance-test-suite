
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { ProfileConfiguration, ProfileConfigurationType } from "@conformance-test-suite/shared/src/profileConfigurationContract";

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
                {profileConfiguration.type === ProfileConfigurationType.API && (
                    <>
                        <div>
                            <h3 className="font-semibold">Authorization Endpoint</h3>
                            <p className="text-sm text-muted-foreground">{profileConfiguration.configuration.authorizationEndpoint}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold">Client ID</h3>
                            <p className="text-sm text-muted-foreground">{profileConfiguration.configuration.clientId}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold">JWKS</h3>
                            <p className="text-sm text-muted-foreground">{profileConfiguration.configuration.jwks}</p>
                        </div>
                    </>
                )}
                </div>
            </CardContent>
        </Card>
    )};