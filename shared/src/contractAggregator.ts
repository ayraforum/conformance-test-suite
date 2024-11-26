// mainContract.ts
import { initContract } from '@ts-rest/core';
import { testContract } from './testContract';
import { systemContract } from './systemContract';

const c = initContract();

export const contract = c.router({
    ...testContract,
    ...systemContract,
});
