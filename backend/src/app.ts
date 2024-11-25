import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import { Server } from "socket.io";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Error Handling
app.use(errorHandler);

export default app;
