import express from "express";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", routes);

// Error Handling
app.use(errorHandler);

export default app;
