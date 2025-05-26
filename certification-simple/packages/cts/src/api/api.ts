import axiosClient from "./axiosClient";

// Fetch Invitation data from the server
export const fetchInvitation = async () => {
  try {
    const response = await axiosClient.get("/api/invitation");
    return response.data.invite;
  } catch (error) {
    console.error("Error fetching invitation:", error);
    throw error;
  }
};
// Fetch DAG data from the server
export const fetchDAG = async () => {
  try {
    const response = await axiosClient.get("/api/dag");
    return response.data.dag;
  } catch (error) {
    console.error("Error fetching DAG:", error);
    throw error;
  }
};

// Fetch DAG data from the server
export const run = async () => {
  try {
    axiosClient.get("/api/run");
  } catch (error) {
    console.error("Error fetching DAG:", error);
    throw error;
  }
};

// Fetch DAG data from the server
export const selectPipeline = async (pipeline: string) => {
  try {
    const response = await axiosClient.get("/api/select/pipeline", {
      params: {
        pipeline: pipeline,
      },
    });
    return response;
  } catch (error) {
    console.error("Error fetching DAG:", error);
    throw error;
  }
};
