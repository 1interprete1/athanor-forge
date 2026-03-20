import { useStore } from '../contexts/StoreContext';

export function useInferenceConfig() {
  const { config, updateConfig, resetConfig } = useStore();
  return { config, updateConfig, resetConfig };
}
