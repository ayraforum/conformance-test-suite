export function getBackendAddress(): string {
    if (process.env.NODE_ENV === "development") {
      return process.env.BACKEND_ADDRESS || "http://localhost:5000";
    }

    const scheme = window.location.protocol === "https:" ? "https" : "http";
    const host = window.location.hostname;

    return `${scheme}://${host}`;
  }
