/**
 * Model Updater Component
 * 
 * Checks for and installs model updates.
 * 
 * @example
 * ```tsx
 * import { ModelUpdater, useModelUpdater } from '@/components/model-updater';
 * 
 * <ModelUpdater onUpdateAvailable={(updates) => console.log(updates)} />
 * 
 * // Or use the hook directly
 * const { updates, isChecking, checkUpdates } = useModelUpdater();
 * ```
 */

export { ModelUpdater, useModelUpdater } from './ModelUpdater';
export type { ModelUpdateInfo } from './ModelUpdater';
