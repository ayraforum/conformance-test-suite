import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.BACKEND_PORT || 5000,
  DB_URI: process.env.DB_URI || "",
  OID_CONFORMANCE_SUITE_API_URL:
    process.env.OID_CONFORMANCE_SUITE_API_URL || "https://localhost:8443/api/",
  AATH_ENABLED: process.env.AATH_ENABLED === "true" || false,
  OIDCS_ENABLED: process.env.OIDCS_ENABLED === "true" || false,
};

console.log(`Backend running on port ${config.PORT}`);
