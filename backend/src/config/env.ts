import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || 5000,
  DB_URI: process.env.DB_URI || "",
  OID_CONFORMANCE_SUITE_API_URL: process.env.OID_CONFORMANCE_SUITE_API_URL || "https://localhost:8443/api/"
};
