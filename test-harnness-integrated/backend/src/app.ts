import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import { Server } from "socket.io";
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from "./controllers/aggregatorController";
import {
  downloadAATH,
  downloadOIDCS,
  getAATHStatus,
  getOIDCSStatus,
  startOIDCS
} from './services/testHarnessService';
import { config } from './config/env';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize test harnesses
async function initializeTestHarnesses() {
  try {
    console.log('Checking test harnesses status...');

    if (config.AATH_ENABLED === true) {
      console.log('AATH is enabled, checking status...');
      // Check AATH status
      const aathStatus = await getAATHStatus();
      if (!aathStatus.isInstalled) {
        console.log('AATH not found, downloading...');
        await downloadAATH()
          .then(() => console.log('AATH initialized successfully'))
          .catch(err => console.error('Failed to initialize AATH:', err));
      } else {
        console.log('AATH is already installed, no actions needed');
      }
    } else {
      console.log('AATH is disabled, no actions needed');
    }

    // Check OIDCS status
    if (config.OIDCS_ENABLED === true) {
      console.log('OIDCS is enabled, checking status...');
      const oidcsStatus = await getOIDCSStatus();
      if (!oidcsStatus.isInstalled) {
        console.log('OIDCS not found, downloading...');
        await downloadOIDCS()
          .then(() => console.log('OIDCS initialized successfully'))
          .catch(err => console.error('Failed to initialize OIDCS:', err));
      } else {
        console.log('OIDCS is already installed, no actions needed');
      }

      // Start OIDCS if it's installed but not running
      if (oidcsStatus.isInstalled && !oidcsStatus.isRunning) {
        console.log('Starting OIDCS service...');
        await startOIDCS()
          .then(() => console.log('OIDCS service started successfully'))
          .catch(err => console.error('Failed to start OIDCS service:', err));
      }

      console.log('Test harnesses initialization complete');
    } else {
      console.log('OIDCS is disabled, no actions needed');
    }

  } catch (error) {
    console.error('Error during test harnesses initialization:', error);
  }
}

// Call initialization on app startup
initializeTestHarnesses();

// Error Handling
app.use(errorHandler);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

export default app;
