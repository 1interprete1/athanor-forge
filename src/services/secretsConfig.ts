/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'ATHANOR_GROQ_API_KEY';

export const secretsConfig = {
  getGroqApiKey: (): string | null => {
    return localStorage.getItem(STORAGE_KEY);
  },
  setGroqApiKey: (key: string): void => {
    localStorage.setItem(STORAGE_KEY, key);
  },
  clearGroqApiKey: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
