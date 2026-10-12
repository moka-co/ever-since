'use client';

import { isVideo } from '@/lib/media/validation';
import {
  getPhotoFramingStyle,
  type PhotoFramingStyle,
} from '@/lib/storage/schema';

export const THUMBNAIL_VIDEO_PLAYBACK_RATE = 1.5;

export type MediaThumbnailSize = 'fill' | 'sm' | 'md';

export interface MediaThumbnailOptions {
  filename: string;
  version?: number;
  size?: MediaThumbnailSize;
  alt?: string;
  lazy?: boolean;
  mediaPositionX?: number;
  mediaPositionY?: number;
  mediaScale?: number;
}

export interface MediaThumbnailDescriptor {
  kind: 'video' | 'photo';
  url: string;
  sizeClass: string;
  badgeText: 'Video' | 'Vid' | null;
  muted: boolean;
  autoPlay: boolean;
  loop: boolean;
  playsInline: boolean;
  playbackRate: number;
  alt: string;
  imageStyle?: PhotoFramingStyle;
}

const SIZE_CLASSES: Record<MediaThumbnailSize, string> = {
  fill: 'w-full h-full',
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
};

export function applyThumbnailPlaybackRate(
  element: { playbackRate: number } | null | undefined
): void {
  if (element) {
    element.playbackRate = THUMBNAIL_VIDEO_PLAYBACK_RATE;
  }
}

export function getMediaThumbnailProps(
  options: MediaThumbnailOptions
): MediaThumbnailDescriptor {
  const {
    filename,
    version,
    size = 'fill',
    alt = '',
    mediaPositionX,
    mediaPositionY,
    mediaScale,
  } = options;

  const video = isVideo(filename);
  const url = version
    ? `/api/media/${filename}?t=${version}`
    : `/api/media/${filename}`;
  const sizeClass = SIZE_CLASSES[size];

  const hasCustomFraming =
    mediaPositionX !== undefined ||
    mediaPositionY !== undefined ||
    mediaScale !== undefined;

  return {
    kind: video ? 'video' : 'photo',
    url,
    sizeClass,
    badgeText: video ? (size === 'sm' ? 'Vid' : 'Video') : null,
    muted: true,
    autoPlay: true,
    loop: true,
    playsInline: true,
    playbackRate: THUMBNAIL_VIDEO_PLAYBACK_RATE,
    alt,
    ...(hasCustomFraming && !video
      ? {
          imageStyle: getPhotoFramingStyle({
            mediaPositionX,
            mediaPositionY,
            mediaScale,
          }),
        }
      : {}),
  };
}

export default function MediaThumbnail(props: MediaThumbnailOptions) {
  const descriptor = getMediaThumbnailProps(props);

  if (descriptor.kind === 'video') {
    const isSmall = (props.size ?? 'fill') === 'sm';
    return (
      <div className={`relative ${descriptor.sizeClass} bg-black/10`}>
        <video
          src={descriptor.url}
          autoPlay={descriptor.autoPlay}
          loop={descriptor.loop}
          muted={descriptor.muted}
          playsInline={descriptor.playsInline}
          onLoadedMetadata={(e) => applyThumbnailPlaybackRate(e.currentTarget)}
          className="w-full h-full object-cover pointer-events-none"
        />
        {descriptor.badgeText && (
          <span
            className={
              isSmall
                ? 'absolute bottom-0.5 right-0.5 bg-black/60 text-[8px] text-white px-1 rounded uppercase font-bold pointer-events-none'
                : 'absolute bottom-1.5 left-1.5 bg-black/65 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider pointer-events-none'
            }
          >
            {descriptor.badgeText}
          </span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={descriptor.url}
      alt={descriptor.alt}
      loading={props.lazy ? 'lazy' : undefined}
      style={descriptor.imageStyle}
      className={`${descriptor.sizeClass} object-cover`}
    />
  );
}
