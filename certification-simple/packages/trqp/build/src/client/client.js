"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const api_client_1 = require("../../gen/api-client");
const configuration = new api_client_1.Configuration({
    basePath: process.env.API_BASE_PATH,
});
exports.client = {
    configuration,
    registryAPI: new api_client_1.RegistryApi(configuration),
    lookupAPI: new api_client_1.LookupsApi(configuration),
};
//# sourceMappingURL=client.js.map