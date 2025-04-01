import {
  Agent,
  ConnectionStateChangedEvent,
  ConnectionEventTypes,
  DidExchangeState,
  OutOfBandRecord,
} from "@credo-ts/core";

export interface ConnectionInvitation {
  outOfBandRecord: OutOfBandRecord;
  invitationUrl: string;
}

/**
 * Creates a new connection invitation using the provided agent.
 *
 * @param agent Instance of a configured and initialized agent.
 * @returns An object containing the out-of-band record and invitation URL.
 */
export const createInvitation = async (
  agent: Agent,
): Promise<ConnectionInvitation> => {
  // Use the agent's OOB module to create an invitation
  const outOfBandRecord = await agent.oob.createInvitation();
  const invitationUrl = outOfBandRecord.outOfBandInvitation.toUrl({
    domain: "https://example.org",
  });
  return { outOfBandRecord, invitationUrl };
};

/**
 * Waits for the connection associated with the provided out-of-band record to complete.
 *
 * @param agent Instance of the agent.
 * @param outOfBandRecord The out-of-band record to match against.
 * @returns A promise that resolves to true when the connection is established.
 */
export const waitForConnection = (
  agent: Agent,
  outOfBandRecord: OutOfBandRecord,
): Promise<boolean> => {
  return new Promise((resolve) => {
    // Set up an event listener for connection state changes
    const listener = (event: ConnectionStateChangedEvent) => {
      const { connectionRecord } = event.payload;
      // Only handle events for our invitation
      if (connectionRecord.outOfBandId !== outOfBandRecord.id) return;
      if (connectionRecord.state === DidExchangeState.Completed) {
        // Remove the listener once the connection is completed
        agent.events.off(ConnectionEventTypes.ConnectionStateChanged, listener);
        resolve(true);
      }
    };

    agent.events.on(ConnectionEventTypes.ConnectionStateChanged, listener);
  });
};
