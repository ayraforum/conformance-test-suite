import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { AATH_PATH } from '../config/constants';

const execAsync = promisify(exec);

const aathPath = AATH_PATH;
const oidcsPath = process.env.OIDCS_PATH || path.join(process.cwd(), 'test-harnesses/openid-conformance-suite');
const defaultAathRevision = process.env.AATH_REVISION || 'main';
const defaultOidcsRevision = process.env.OIDCS_REVISION || 'main';

export const downloadAATH = async (revision?: string): Promise<void> => {
  const revisionToUse = revision || defaultAathRevision;
  try {
    // Check if directory exists
    try {
      await fs.access(aathPath);
      // If exists, pull latest changes
      await execAsync('git pull origin main', { cwd: aathPath });
    } catch {
      // If doesn't exist, clone repository
      await execAsync(`git clone https://github.com/openwallet-foundation/owl-agent-test-harness.git ${aathPath}`);
    }

    await execAsync(`git checkout ${revisionToUse}`, { cwd: aathPath });

  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Failed to download AATH: ${error.message}`);
  }
};

export const downloadOIDCS = async (revision?: string): Promise<void> => {
  const revisionToUse = revision || defaultOidcsRevision;
  try {
    // Check if directory exists
    try {
      await fs.access(oidcsPath);
      // If exists, pull latest changes
      await execAsync('git pull origin main', { cwd: oidcsPath });
    } catch {
      // If doesn't exist, clone repository
      await execAsync(`git clone https://gitlab.com/openid/conformance-suite.git ${oidcsPath}`);
    }

    // Checkout specific revision if provided
    await execAsync(`git checkout ${revisionToUse}`, { cwd: oidcsPath });

  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Failed to download OIDCS: ${error.message}`);
  }
};

export const startOIDCS = async (): Promise<void> => {
  try {
    // Start the OpenID Conformance Suite using devenv
    await execAsync('devenv up -d', { cwd: oidcsPath });

    // Start the server in a new process
    await execAsync('mvn spring-boot:run', { cwd: oidcsPath });
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Failed to start OIDCS: ${error.message}`);
  }
  console.log('OIDCS started successfully');
};

export const stopOIDCS = async (): Promise<void> => {
  try {
    // Stop the OpenID Conformance Suite
    await execAsync('devenv down', { cwd: oidcsPath });
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Failed to stop OIDCS: ${error.message}`);
  }
};

export const getAATHStatus = async (): Promise<{ isInstalled: boolean; currentRevision?: string }> => {
  try {
    await fs.access(aathPath);
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: aathPath });
    return { isInstalled: true, currentRevision: stdout.trim() };
  } catch {
    return { isInstalled: false };
  }
};

export const getOIDCSStatus = async (): Promise<{ isInstalled: boolean; currentRevision?: string; isRunning: boolean }> => {
  try {
    await fs.access(oidcsPath);
    const { stdout: revision } = await execAsync('git rev-parse HEAD', { cwd: oidcsPath });

    // Check if OIDCS is running by checking its API endpoint
    const isRunning = await fetch(process.env.OID_CONFORMANCE_SUITE_API_URL + '/info')
      .then(() => true)
      .catch(() => false);

    return {
      isInstalled: true,
      currentRevision: revision.trim(),
      isRunning
    };
  } catch {
    return { isInstalled: false, isRunning: false };
  }
};