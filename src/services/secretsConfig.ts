/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'ATHANOR_GROQ_API_KEY';
const OPENAI_KEY = 'ATHANOR_OPENAI_API_KEY';
const GITHUB_TOKEN_KEY = 'ATHANOR_GITHUB_TOKEN';
const GITHUB_USER_KEY = 'ATHANOR_GITHUB_USER';
const GITHUB_REPO_KEY = 'ATHANOR_GITHUB_REPO';

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
  getOpenAiApiKey: (): string | null => {
    return localStorage.getItem(OPENAI_KEY);
  },
  setOpenAiApiKey: (key: string): void => {
    localStorage.setItem(OPENAI_KEY, key);
  },
  clearOpenAiApiKey: (): void => {
    localStorage.removeItem(OPENAI_KEY);
  },
  getGithubToken: (): string | null => {
    return localStorage.getItem(GITHUB_TOKEN_KEY);
  },
  setGithubToken: (token: string): void => {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
  },
  clearGithubToken: (): void => {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
  },
  getGithubUser: (): string => {
    return localStorage.getItem(GITHUB_USER_KEY) || '1interprete1';
  },
  setGithubUser: (user: string): void => {
    localStorage.setItem(GITHUB_USER_KEY, user);
  },
  getGithubRepo: (): string => {
    return localStorage.getItem(GITHUB_REPO_KEY) || 'athanor-forge';
  },
  setGithubRepo: (repo: string): void => {
    localStorage.setItem(GITHUB_REPO_KEY, repo);
  }
};
