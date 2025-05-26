// mainContract.ts
import { initContract } from '@ts-rest/core';
import { systemContract } from './systemContract';
import { profileConfigurationContract } from './profileConfigurationContract';
import { testRunContract } from './testRunsContract';
import { testHarnessContract } from './testHarnessContract';
const c = initContract();

export const contract = c.router({
    ...systemContract,
    ...profileConfigurationContract,
    ...testRunContract,
    ...testHarnessContract,
});
