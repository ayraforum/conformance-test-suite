// libs/agentService.ts

import { BaseAgent } from "@/core"; // Adjust this path if your BaseAgent is located elsewhere
import qrcord from "qrcode-terminal";
import ngrok from "ngrok";
import { createAgentConfig } from "@/models/AgentConfig"; // Using your AgentConfig from models
import {
    Agent,
    OutOfBandRecord,
    DidExchangeState,
    ConnectionRecord,
    ConnectionStateChangedEvent,
    ConnectionEventTypes,
} from "@credo-ts/core";
import { v4 } from "uuid";

const agentId = v4();
const port: number = Number(process.env.PORT) || 3033;

/**
 * Initializes the agent, creates an out-of-band invitation, and logs the invitation URL.
 * Also generates a QR code for the invitation.
 */
export const runAgent = async (): Promise<void> => {
    try {
        // Start ngrok tunnel to expose the local port
        const ngrokUrl = await ngrok.connect({
            addr: port,
            proto: "http",
            authtoken: process.env.NGROK_AUTH_TOKEN,
        });

        // Create agent configuration using the AgentConfig model
        const config = createAgentConfig("Agent", port, agentId, ngrokUrl, [
            ngrokUrl,
        ]);
        const agent = new BaseAgent(config);

        // Initialize the agent
        await agent.init();

        // Create an out-of-band invitation
        const outOfBandRecord: OutOfBandRecord =
            await agent.agent.oob.createInvitation();
        const outOfBandInvitation = outOfBandRecord.outOfBandInvitation;
        const oobId = outOfBandRecord.id;

        if (!outOfBandInvitation) {
            throw new Error("Out-of-band invitation was not created");
        }

        // Generate the invitation URL using the ngrok URL as the domain
        const urlMessage = outOfBandInvitation.toUrl({
            domain: ngrokUrl,
        });

        console.log("Verifier OOB Invitation URL:\n", urlMessage);
        qrcord.generate(urlMessage, { small: true });

        // Retrieve connection record (this waits until a connection is established)
        const verifierConnectionTmp = await getConnectionRecord(
            agent.agent,
            oobId,
        );
        console.log("Verifier connection record:", verifierConnectionTmp);

        const verifierConnection =
            await agent.agent.connections.returnWhenIsConnected(
                verifierConnectionTmp!.id,
            );
        console.log("Verifier connection established:", verifierConnection);
    } catch (error) {
        console.error("Error initializing agent:", error);
    } finally {
        await ngrok.disconnect(); // Close ngrok tunnel
    }
};

/**
 * Sets up a connection listener that fires the callback when the connection
 * corresponding to the out-of-band record is completed.
 */
export const setupConnectionListener = async (
    agent: Agent,
    outOfBandRecord: OutOfBandRecord,
    cb: (...args: any) => void,
): Promise<void> => {
    agent.events.on<ConnectionStateChangedEvent>(
        ConnectionEventTypes.ConnectionStateChanged,
        ({ payload }) => {
            console.log("Connection state changed:", payload.connectionRecord);
            if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id)
                return;
            if (payload.connectionRecord.state === DidExchangeState.Completed) {
                console.log(
                    `Connection for out-of-band id ${outOfBandRecord.id} completed`,
                );
                console.log("Connection record:", payload.connectionRecord);
                cb();
            }
        },
    );
};

/**
 * Retrieves the connection record associated with the specified out-of-band ID.
 * Resolves when the connection record is found or rejects after a timeout.
 */
export const getConnectionRecord = (
    agent: Agent,
    outOfBandId: string,
): Promise<ConnectionRecord> =>
    new Promise<ConnectionRecord>((resolve, reject) => {
        console.log(
            "Getting connection record for out-of-band id:",
            outOfBandId,
        );
        const timeoutId = setTimeout(
            () => reject(new Error("Missing connection record")),
            50000,
        );

        agent.events.on<ConnectionStateChangedEvent>(
            ConnectionEventTypes.ConnectionStateChanged,
            (e) => {
                console.log("Received connection event");
                if (e.payload.connectionRecord.outOfBandId !== outOfBandId)
                    return;

                clearTimeout(timeoutId);
                resolve(e.payload.connectionRecord);
            },
        );

        // Also check if the connection record already exists
        void agent.connections
            .findAllByOutOfBandId(outOfBandId)
            .then(([connectionRecord]) => {
                if (connectionRecord) {
                    clearTimeout(timeoutId);
                    resolve(connectionRecord);
                }
            });
    });
