import type { BackgroundId, BackgroundSettings } from '../../types/domain';

export interface BackgroundPreset {
  id: Exclude<BackgroundId, 'custom'>;
  name: string;
  description: string;
  assetPath?: string;
}

export const backgroundPresets: BackgroundPreset[] = [
  {
    id: 'alpine-blue-hour',
    name: 'Alpine blue hour',
    description: 'Still water and indigo mountains',
    assetPath: '/backgrounds/alpine-blue-hour.webp',
  },
  {
    id: 'night-coast',
    name: 'Night coast',
    description: 'Open ocean after twilight',
    assetPath: '/backgrounds/night-coast.webp',
  },
  {
    id: 'misty-evergreens',
    name: 'Misty evergreens',
    description: 'A quiet valley before sunrise',
    assetPath: '/backgrounds/misty-evergreens.webp',
  },
  {
    id: 'midnight',
    name: 'Midnight atmosphere',
    description: 'The original abstract background',
  },
];

export function localAssetUrl(path: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) return chrome.runtime.getURL(path);
  return path;
}

export function selectedBackgroundImage(settings: BackgroundSettings): string | undefined {
  if (settings.selected === 'custom') return settings.customImage?.dataUrl;
  const preset = backgroundPresets.find((item) => item.id === settings.selected);
  return preset?.assetPath ? localAssetUrl(preset.assetPath) : undefined;
}

export function backgroundPreviewImage(id: BackgroundId, settings: BackgroundSettings): string | undefined {
  if (id === 'custom') return settings.customImage?.dataUrl;
  const preset = backgroundPresets.find((item) => item.id === id);
  return preset?.assetPath ? localAssetUrl(preset.assetPath) : undefined;
}
