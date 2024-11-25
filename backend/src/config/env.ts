import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || 3000,
  DB_URI: process.env.DB_URI || "",
};
