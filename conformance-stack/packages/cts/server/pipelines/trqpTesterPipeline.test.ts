import {
  APIConformanceTask,
  AuthorizationVerificationTask,
  TRQPEvaluationTask,
} from "./trqpTesterPipeline";

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

describe("TRQPTesterPipeline task behavior", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("APIConformanceTask calls real extension endpoint tests and fails when endpoint checks fail", async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (String(url).endsWith("/metadata")) return makeResponse("metadata unavailable", { ok: false, status: 503 });
      if (String(url).endsWith("/authorizations")) return makeResponse([]);
      if (String(url).endsWith("/recognitions")) return makeResponse([]);
      if (String(url).endsWith("/assuranceLevels")) return makeResponse([]);
      if (String(url).endsWith("/didMethods")) return makeResponse([]);
      return makeResponse({});
    }) as jest.Mock;

    const task = new APIConformanceTask("API Conformance", "Test API", "https://tr.example");

    await task.run();
    const results = await task.results();

    expect(fetch).toHaveBeenCalled();
    expect((fetch as jest.Mock).mock.calls.some(([url]) => String(url) === "https://tr.example/metadata")).toBe(
      true
    );
    expect((fetch as jest.Mock).mock.calls.some(([url]) => String(url) === "https://tr.example/authorization")).toBe(
      false
    );
    expect((fetch as jest.Mock).mock.calls.some(([url]) => String(url) === "https://tr.example/recognition")).toBe(
      false
    );
    expect(task.state.status).toBe("Failed");
    expect(results.value.failedCount).toBeGreaterThan(0);
  });

  test("AuthorizationVerificationTask performs a real POST and does not return hardcoded positives", async () => {
    global.fetch = jest.fn().mockResolvedValue(makeResponse("not authorized", { ok: false, status: 403 })) as jest.Mock;

    const task = new AuthorizationVerificationTask("Authorization Verification", "Verify auth", "https://tr.example");

    await task.run();
    const results = await task.results();

    expect(fetch).toHaveBeenCalledWith(
      "https://tr.example/authorization",
      expect.objectContaining({ method: "POST" })
    );
    expect(task.state.status).toBe("Failed");
    expect(results.value.tests?.positiveCase).not.toBe(true);
  });

  test("TRQPEvaluationTask does not report Full conformance when upstream real checks fail", async () => {
    const task = new TRQPEvaluationTask("TRQP Evaluation", "Evaluate");

    await task.run({
      didAccepted: true,
      apiAccepted: false,
      authorizationAccepted: false,
    });
    const results = await task.results();

    expect(task.state.status).toBe("Failed");
    expect(results.value.conformanceLevel).toBe("None");
    expect(results.value.details.overall).toBe("Fail");
  });
});
