import { Configuration, RegistryApi, LookupsApi } from "../../gen/api-client";
type Client = {
    configuration: Configuration;
    registryAPI: RegistryApi;
    lookupAPI: LookupsApi;
};
export declare const client: Client;
export {};
