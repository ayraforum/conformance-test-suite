import { formatDomain } from "@/services/urlUtils";

export type AgentConfig = {
    name: string;
    label: string;
    port: number;
    config: {
        label: string;
        walletConfig: {
            id: string;
            key: string;
        };
        autoUpdateStorageOnStartup: boolean;
    };
    mediatorURL: string;
    domain?: string;
    endpoints?: string[];
};

/**
 * Creates an agent configuration with properly formatted domain and endpoints.
 * 
 * @param name The agent name
 * @param port The port the agent will run on
 * @param id The agent ID
 * @param domain Optional domain for the agent
 * @param endpoints Optional endpoints for the agent
 * @returns A properly configured agent configuration
 */
export const createAgentConfig = (
    name: string,
    port: number,
    id: string,
    domain?: string,
    endpoints?: string[],
): AgentConfig => {
    // Ensure the domain is properly formatted
    const formattedDomain = formatDomain(domain);
    
    // Format endpoints if provided, otherwise use default
    const formattedEndpoints = endpoints 
        ? endpoints.map(endpoint => formatDomain(endpoint))
        : [`http://localhost:${port}`];
    
    return {
        name,
        label: `${name} Label`,
        port,
        config: {
            label: name,
            walletConfig: {
                id,
                key: `${id}key`,
            },
            autoUpdateStorageOnStartup: true,
        },
        mediatorURL: "",
        domain: formattedDomain,
        endpoints: formattedEndpoints,
    };
};
