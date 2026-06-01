import {
  runAllConformanceTests,
  testCheckEntityAuthorization,
  testCheckEcosystemRecognition,
  testLookupAuthorizations,
} from "./trustRegistryApi";

const makeResponse = (body: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}) => {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  const statusText = init.statusText ?? (ok ? "OK" : "Server Error");
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok,
    status,
    statusText,
    headers: {
      get: () => "application/json",
    },
    json: async () => {
      if (typeof body === "string") throw new Error("not json");
      return body;
    },
    text: async () => raw,
  } as unknown as Response;
};

describe("TRQP registry API conformance paths", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("runAllConformanceTests calls only Ayra extension endpoint checks and no stale paths", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (String(url).endsWith("/authorizations")) return makeResponse([]);
      if (String(url).endsWith("/recognitions")) return makeResponse([]);
      if (String(url).endsWith("/assuranceLevels")) return makeResponse([]);
      if (String(url).endsWith("/didMethods")) return makeResponse([]);
      if (String(url).endsWith("/metadata")) return makeResponse({});
      if (String(url).includes("/entities/")) return makeResponse({});
      if (String(url).includes("/ecosystems/")) return makeResponse({});
      return makeResponse({});
    }) as jest.Mock;

    await runAllConformanceTests("https://tr.example");

    expect(fetch).toHaveBeenCalledWith("https://tr.example/metadata", expect.anything());
    expect(fetch).toHaveBeenCalledWith("https://tr.example/entities/did%3Aexample%3Aentity123", expect.anything());
    expect(fetch).toHaveBeenCalledWith(
      "https://tr.example/entities/did%3Aexample%3Aentity123/authorizations",
      expect.anything()
    );
    expect(fetch).toHaveBeenCalledWith("https://tr.example/ecosystems/did%3Aexample%3Aecosystem", expect.anything());
    expect(fetch).toHaveBeenCalledWith(
      "https://tr.example/ecosystems/did%3Aexample%3Aecosystem/recognitions",
      expect.anything()
    );
    expect(fetch).toHaveBeenCalledWith("https://tr.example/lookups/assuranceLevels", expect.anything());
    expect(fetch).toHaveBeenCalledWith("https://tr.example/lookups/authorizations", expect.anything());
    expect(fetch).toHaveBeenCalledWith("https://tr.example/lookups/didMethods", expect.anything());
    expect(fetch).not.toHaveBeenCalledWith(
      "https://tr.example/authorization",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetch).not.toHaveBeenCalledWith(
      "https://tr.example/recognition",
      expect.objectContaining({ method: "POST" })
    );

    for (const [url] of (fetch as jest.Mock).mock.calls) {
      expect(String(url)).not.toMatch(/\/authorization(?:[/?#]|$)/);
      expect(String(url)).not.toMatch(/\/recognition(?:[/?#]|$)/);
      expect(String(url)).not.toMatch(/\/entities\/did%3Aexample%3Aentity123\/authorization(?:[/?#]|$)/);
      expect(String(url)).not.toContain("/registries/");
      expect(String(url)).not.toContain("/ecosystems/did%3Aexample%3Aecosystem/lookups/");
      expect(String(url)).not.toContain("/egfs/");
      expect(String(url)).not.toContain("/lookup/authorizations");
      expect(String(url)).not.toContain("/lookup/vidmethods");
      expect(String(url)).not.toContain("/didmethods");
    }
  });

  test("core POST checks send the TRQP v2 request bodies", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeResponse({ authorized: true }))
      .mockResolvedValueOnce(makeResponse({ recognized: true })) as jest.Mock;

    await testCheckEntityAuthorization(
      "https://tr.example",
      "did:example:entity123",
      "did:example:authz",
      "did:example:ecosystem"
    );
    await testCheckEcosystemRecognition("https://tr.example", "did:example:ecosystem", "did:example:egf");

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://tr.example/authorization",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entity_id: "did:example:entity123",
          authority_id: "did:example:ecosystem",
          action: "issue",
          resource: "did:example:authz",
          context: {},
        }),
      })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://tr.example/recognition",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entity_id: "did:example:ecosystem",
          authority_id: "did:example:egf",
          action: "member-of",
          resource: "ayratrustnetwork",
          context: {},
        }),
      })
    );
  });

  test("core POST checks pass on positive 200 JSON responses", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeResponse({ authorized: true }))
      .mockResolvedValueOnce(makeResponse({ recognized: true })) as jest.Mock;

    await expect(
      testCheckEntityAuthorization("https://tr.example", "did:example:entity123", "did:example:authz", "did:example:egf")
    ).resolves.toMatchObject({ name: "POST /authorization", status: "passed" });
    await expect(
      testCheckEcosystemRecognition("https://tr.example", "did:example:ecosystem", "did:example:egf")
    ).resolves.toMatchObject({ name: "POST /recognition", status: "passed" });
  });

  test("core POST check failures include status and body summary", async () => {
    global.fetch = jest.fn().mockResolvedValue(makeResponse("registry unavailable", { ok: false, status: 503 })) as jest.Mock;

    const result = await testCheckEntityAuthorization(
      "https://tr.example",
      "did:example:entity123",
      "did:example:authz",
      "did:example:egf"
    );

    expect(result.status).toBe("failed");
    expect(result.details).toContain("503");
    expect(result.details).toContain("registry unavailable");
  });

  test("extension 501 is documented not implemented evidence and non-JSON bodies do not crash", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      makeResponse("not implemented", {
        ok: false,
        status: 501,
        statusText: "Not Implemented",
      })
    ) as jest.Mock;

    const result = await (testLookupAuthorizations as any)("https://tr.example", {});

    expect(result.status).toBe("passed");
    expect(result.details).toContain("501");
    expect(result.details).toContain("not implemented");
  });
});
