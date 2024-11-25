import { createServer } from "http";
import app from "./app";
import { io } from "./websocket";

const httpServer = createServer(app);

io.attach(httpServer);

// Start the server
const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
