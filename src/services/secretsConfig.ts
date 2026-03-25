/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'ATHANOR_GROQ_API_KEY';
const GITHUB_TOKEN_KEY = 'ATHANOR_GITHUB_TOKEN';

export const secretsConfig = {
  getGroqApiKey: (): string | null => {
    return localStorage.getItem(STORAGE_KEY);
  },
  setGroqApiKey: (key: string): void => {
    localStorage.setItem(STORAGE_KEY, key);
  },
  clearGroqApiKey: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },
  getGithubToken: (): string | null => {
    return localStorage.getItem(GITHUB_TOKEN_KEY);
  },
  setGithubToken: (token: string): void => {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
  },
  clearGithubToken: (): void => {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
  }
};
