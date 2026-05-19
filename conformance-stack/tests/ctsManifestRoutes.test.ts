import express = require("express");
import http = require("http");
import type {
  CtsCriterion,
  CtsManifest,
} from "../packages/cts/server/manifest";
import { registerCtsManifestRoutes } from "../packages/cts/server/manifest/routes";

const listen = async (app: express.Express) => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP server address");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  };
};

describe("CTS manifest HTTP routes", () => {
  test("serves the conformance manifest and criteria without starting an agent", async () => {
    const app = express();
    registerCtsManifestRoutes(app);
    const server = await listen(app);

    try {
      const manifestResponse = await fetch(
        `${server.baseUrl}/api/conformance/manifest`
      );
      expect(manifestResponse.status).toBe(200);
      const manifest = (await manifestResponse.json()) as CtsManifest;
      expect(manifest.profileId).toBe("ayra-didcomm-w3c-ldp-trqp");
      expect(manifest.testCases.length).toBeGreaterThanOrEqual(4);

      const criteriaResponse = await fetch(
        `${server.baseUrl}/api/conformance/criteria`
      );
      expect(criteriaResponse.status).toBe(200);
      const criteria = (await criteriaResponse.json()) as {
        criteria: CtsCriterion[];
      };
      expect(criteria.criteria.map((criterion) => criterion.id)).toContain(
        "AYRA-PP20-VERIFY-TRUE"
      );
    } finally {
      await server.close();
    }
  });
});
