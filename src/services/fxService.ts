/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ForgeLoggerContextType } from '../contexts/ForgeLogger';

const FX_CACHE_KEY = 'athanor_fx_rate';
const FX_TIMESTAMP_KEY = 'athanor_fx_timestamp';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms
const FALLBACK_RATE = 20.00;

export interface FXData {
  rate: number;
  timestamp: number;
  source: 'api' | 'cache' | 'fallback';
}

export const fxService = {
  async getExchangeRate(logger: ForgeLoggerContextType): Promise<FXData> {
    const cachedRate = localStorage.getItem(FX_CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(FX_TIMESTAMP_KEY);
    const now = Date.now();

    if (cachedRate && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      if (now - timestamp < CACHE_DURATION) {
        return {
          rate: parseFloat(cachedRate),
          timestamp,
          source: 'cache'
        };
      }
    }

    logger.addLog('Financial', 'info', "FX Engine: Fetching real-time exchange rate USD -> MXN", {});
    
    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=MXN');
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const data = await response.json();
      const rate = data.rates.MXN;

      const groupId = logger.startGroup("Financial Localization: FX Sync Success");
      logger.addLog('Financial', 'success', `Currency Sync: 1 USD = ${rate} MXN verified via Frankfurter API`, { groupId });
      logger.startSubGroup(groupId, "Financial Localization Data");
      logger.addLog('Financial', 'debug', "API Response Payload", { raw: data, groupId });
      logger.endGroup(); // end subGroup
      logger.endGroup(); // end group

      localStorage.setItem(FX_CACHE_KEY, rate.toString());
      localStorage.setItem(FX_TIMESTAMP_KEY, now.toString());

      return {
        rate,
        timestamp: now,
        source: 'api'
      };
    } catch (error) {
      logger.addLog('Financial', 'error', "FX Engine Failure: Falling back to static rate (20.00 MXN)", { error });
      return {
        rate: FALLBACK_RATE,
        timestamp: now,
        source: 'fallback'
      };
    }
  }
};
