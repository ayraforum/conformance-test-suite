import { buildTrqpPolicySuggestion } from "./trqpSuggestion";

const jsonResponse = (body: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}) => {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  const statusText = init.statusText ?? (ok ? "OK" : "Server Error");
  return {
    ok,
    status,
    statusText,
    headers: {
      get: () => null,
    },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
};

describe("buildTrqpPolicySuggestion", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_TRQP_KNOWN_ENDPOINT = "https://tr.example";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test("uses current Ayra authorization and recognition lookup paths", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url === "https://tr.example/lookups/authorizations") {
        return jsonResponse([{ action: "issue", resource: "ayracard:businesscard" }]);
      }
      if (url === "https://tr.example/ecosystems/did%3Awebvh%3Aexample.com%3Aecosystem/recognitions") {
        return jsonResponse([{ action: "member-of", resource: "ayratrustnetwork", authority_id: "did:webvh:ayra.forum" }]);
      }
      return jsonResponse("not found", { ok: false, status: 404, statusText: "Not Found" });
    }) as jest.Mock;

    const result = await buildTrqpPolicySuggestion({
      ecosystemDid: "did:webvh:example.com:ecosystem",
      trustNetworkDid: "did:webvh:ayra.forum",
      cardType: "businesscard",
    });

    expect(result.mode).toBe("both");
    expect(fetch).toHaveBeenCalledWith("https://tr.example/lookups/authorizations");
    expect(fetch).toHaveBeenCalledWith(
      "https://tr.example/ecosystems/did%3Awebvh%3Aexample.com%3Aecosystem/recognitions"
    );
    for (const [url] of (fetch as jest.Mock).mock.calls) {
      expect(String(url)).not.toContain("/ecosystems/did%3Awebvh%3Aexample.com%3Aecosystem/lookups/authorizations");
      expect(String(url)).not.toContain("ecosystem_did=");
    }
  });
});
