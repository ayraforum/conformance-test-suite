import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import {
  setInvitation,
  setConnectionStatus,
  setError,
} from "../store/invitationSlice";
import { getSocket } from "../utils/socketManager";

const useInvitationSocket = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Get the socket instance from the socket manager
    const socket = getSocket();

    if (!socket) return;

    // Listen for the "invitation" event
    socket.on("invitation", (invitationData: string) => {
      console.log("got invitation", invitationData);
      dispatch(setInvitation(invitationData));
    });

    // Handle successful connection
    socket.on("connect", () => {
      dispatch(setConnectionStatus("connected"));
      dispatch(setError(null));
    });

    // Handle reconnection attempts
    socket.on("reconnect_attempt", (attempt) => {
      dispatch(setConnectionStatus(`reconnecting (attempt ${attempt})`));
    });

    // Handle connection errors
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
      // Cleanup listeners when the component is unmounted or socket changes
      socket.off("invitation");
      socket.off("connect");
      socket.off("reconnect_attempt");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, [dispatch]);

  return {};
};

export default useInvitationSocket;
