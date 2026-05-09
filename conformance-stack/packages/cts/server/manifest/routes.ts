import type { Express, Request, Response } from "express";
import { ctsManifest, validateCtsManifest } from ".";

const sendManifest = (_req: Request, res: Response) => {
  const validationErrors = validateCtsManifest(ctsManifest);

  if (validationErrors.length > 0) {
    return res.status(500).json({
      error: "CTS manifest is invalid",
      validationErrors,
    });
  }

  return res.json(ctsManifest);
};

const sendCriteria = (_req: Request, res: Response) => {
  return res.json({
    manifestVersion: ctsManifest.manifestVersion,
    profileId: ctsManifest.profileId,
    profileVersion: ctsManifest.profileVersion,
    criteria: ctsManifest.criteria,
  });
};

export const registerCtsManifestRoutes = (app: Express) => {
  app.get("/api/conformance/manifest", sendManifest);
  app.get("/conformance/manifest", sendManifest);
  app.get("/api/conformance/criteria", sendCriteria);
  app.get("/conformance/criteria", sendCriteria);
};
