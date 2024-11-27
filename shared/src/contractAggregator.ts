// mainContract.ts
import { initContract } from '@ts-rest/core';
import { systemContract } from './systemContract';
import { profileConfigurationContract } from './profileConfigurationContract';
import { testRunContract } from './testRunsContract';
const c = initContract();

export const contract = c.router({
    ...systemContract,
    ...profileConfigurationContract,
    ...testRunContract
});
