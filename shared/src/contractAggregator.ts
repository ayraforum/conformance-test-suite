// mainContract.ts
import { initContract } from '@ts-rest/core';
import { testContract } from './testContract';
const c = initContract();

export const contract = c.router({
    ...testContract
});