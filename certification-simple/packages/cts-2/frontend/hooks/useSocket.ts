import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import {
  connectSocket,
  setConnectionStatus,
  setError,
  disconnectSocket,
} from "../store/socketSlice";
import { getSocket } from "../utils/socketManager"; // Import the function to get the socket instance

const serverPort: number = Number(process.env.REACT_APP_SERVER_PORT) || 5005;
const SOCKET_SERVER_URL = `http://localhost:${serverPort}`;

const useSocket = () => {
  const url = SOCKET_SERVER_URL;
  const dispatch = useDispatch();

  // Select the socket instance from the state (if needed)
  const connectionStatus = useSelector(
    (state: RootState) => state.socket.connectionStatus
  );

  useEffect(() => {
    // Initialize the socket connection
    dispatch(connectSocket(url));

    // Get the socket instance from the socket manager
    const socket = getSocket();

    if (!socket) return;

    // Handle successful connection
    socket.on("connect", () => {
      dispatch(setConnectionStatus("connected"));
      dispatch(setError(null));
    });

    // Handle reconnection attempts
    socket.on("reconnect_attempt", (attempt) => {
      dispatch(setConnectionStatus(`reconnecting (attempt ${attempt})`));
    });

    // Handle errors
    socket.on("connect_error", (err) => {
      dispatch(setError("Failed to connect to the server."));
      dispatch(setConnectionStatus("disconnected"));
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      dispatch(
        setError(
          reason !== "io client disconnect"
            ? "Disconnected from the server."
            : null
        )
      );
      dispatch(setConnectionStatus("disconnected"));
    });

    return () => {
      // Cleanup listeners on unmount
      socket.off("connect");
      socket.off("reconnect_attempt");
      socket.off("connect_error");
      socket.off("disconnect");
      dispatch(disconnectSocket());
    };
  }, [dispatch, url]);

  return { connectionStatus };
};

export default useSocket;
