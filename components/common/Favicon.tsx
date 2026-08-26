import clsx from 'clsx';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { faviconUrl } from '../../lib/chrome/favicon';
import { hostnameInitial } from '../../lib/utils/url';

interface FaviconProps {
  url: string;
  name?: string | undefined;
  source?: string | undefined;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

function isLightMonochromeImage(image: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let visiblePixels = 0;
    let lightPixels = 0;
    let totalLuminance = 0;
    let totalSaturation = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] ?? 0;
      if (alpha < 48) continue;
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      visiblePixels += 1;
      totalLuminance += luminance;
      totalSaturation += maximum === 0 ? 0 : (maximum - minimum) / maximum;
      if (luminance > 205) lightPixels += 1;
    }

    if (visiblePixels === 0) return false;
    return totalLuminance / visiblePixels > 205
      && lightPixels / visiblePixels > 0.62
      && totalSaturation / visiblePixels < 0.18;
  } catch {
    // Some remote favicon sources cannot be sampled because of browser origin rules.
    return false;
  }
}

export function Favicon({ url, name, source, size = 'medium', className }: FaviconProps) {
  const chromeSource = faviconUrl(url, size === 'large' ? 64 : 32);
  const candidates = useMemo(() => [...new Set([source, chromeSource].filter((item): item is string => Boolean(item)))], [source, chromeSource]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [lightMonochrome, setLightMonochrome] = useState(false);
  useEffect(() => {
    setCandidateIndex(0);
    setLightMonochrome(false);
  }, [url, source, size]);
  const resolved = candidates[candidateIndex];

  const onImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    setLightMonochrome(isLightMonochromeImage(event.currentTarget));
  };

  return (
    <span className={clsx('favicon', `favicon--${size}`, lightMonochrome && 'favicon--light-monochrome', className)} aria-hidden="true">
      {resolved ? (
        <img src={resolved} alt="" onLoad={onImageLoad} onError={() => setCandidateIndex((index) => index + 1)} />
      ) : (
        <span>{hostnameInitial(url, name)}</span>
      )}
    </span>
  );
}
