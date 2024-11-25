import { Request, Response } from "express";
import { TestService } from '../services/testService';
import { ExecuteProfile } from '../models/testModel';

const testService = new TestService();

export const executeProfile = async (req: Request, res: Response) => {
    const data = req.body as ExecuteProfile;

    if (!('systemName' in data) || !('systemVersion' in data) || !('systemEndpoint' in data) || !('runId' in data)) {
        res.status(400).json({
            error: "Missing required fields. Please provide systemName, systemVersion, systemEndpoint, and runId."
        });
        return;
    }

    try {
        await testService.executeProfile(data);
        res.status(200).json({ message: "Command started" });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to start command";
        res.status(500).json({ error: errorMessage });
    }
};

export const checkConformance = async (req: Request, res: Response) => {
    const { runId } = req.params;

    try {
        const conformanceResult = await testService.checkConformance(runId);
        res.status(200).json(conformanceResult);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to process test results";
        const status = errorMessage === "Test results file not found" ? 404 : 500;
        res.status(status).json({ error: errorMessage });
    }
};