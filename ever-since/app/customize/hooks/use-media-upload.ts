'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaRecord } from '@/lib/storage/schema';
import { validateMediaConstraints } from '@/lib/media/validation';

export const NO_MEDIA_FILE_ERROR = 'Please select a photo or video to upload.';
export const UPLOAD_FALLBACK_ERROR = 'Failed to upload media.';
export const UPLOAD_NETWORK_ERROR =
  'A network error occurred while uploading. Please try again.';

export function appendUniqueMedia(
  list: MediaRecord[],
  item: MediaRecord
): MediaRecord[] {
  const existingIndex = list.findIndex((m) => m.id === item.id);
  if (existingIndex !== -1) {
    const next = [...list];
    next[existingIndex] = item;
    return next;
  }
  return [...list, item];
}

export interface MediaUploadState {
  isUploading: boolean;
  errorMessage: string | null;
}

export interface MediaUploadCallbacks {
  onSuccess?: (media: MediaRecord) => void;
  onError?: (errorMessage: string) => void;
}

export interface MediaUploadControllerOptions extends MediaUploadCallbacks {
  fetchImpl?: typeof fetch;
  onRefresh?: () => void;
  onStateChange?: (state: MediaUploadState) => void;
}

export class MediaUploadController {
  private fetchImpl: typeof fetch;
  private onRefresh?: () => void;
  private onSuccess?: (media: MediaRecord) => void;
  private onError?: (errorMessage: string) => void;
  private onStateChange?: (state: MediaUploadState) => void;
  private state: MediaUploadState = {
    isUploading: false,
    errorMessage: null,
  };

  constructor(options: MediaUploadControllerOptions = {}) {
    this.fetchImpl =
      options.fetchImpl ??
      ((...args: Parameters<typeof fetch>) => fetch(...args));
    this.onRefresh = options.onRefresh;
    this.onSuccess = options.onSuccess;
    this.onError = options.onError;
    this.onStateChange = options.onStateChange;
  }

  public getState(): MediaUploadState {
    return { ...this.state };
  }

  public setCallbacks(callbacks: MediaUploadCallbacks): void {
    this.onSuccess = callbacks.onSuccess;
    this.onError = callbacks.onError;
  }

  private setState(partial: Partial<MediaUploadState>): void {
    this.state = { ...this.state, ...partial };
    this.onStateChange?.(this.getState());
  }

  public clearError(): void {
    this.setState({ errorMessage: null });
  }

  public async uploadFile(
    file: File | null | undefined,
    currentCount: number,
    inputElement?: { value: string } | null
  ): Promise<MediaRecord | null> {
    if (!file) {
      this.setState({ isUploading: false, errorMessage: NO_MEDIA_FILE_ERROR });
      this.onError?.(NO_MEDIA_FILE_ERROR);
      if (inputElement) {
        inputElement.value = '';
      }
      return null;
    }

    const validationError = validateMediaConstraints(
      { name: file.name, size: file.size },
      currentCount
    );
    if (validationError) {
      this.setState({ isUploading: false, errorMessage: validationError });
      this.onError?.(validationError);
      if (inputElement) {
        inputElement.value = '';
      }
      return null;
    }

    this.setState({ isUploading: true, errorMessage: null });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await this.fetchImpl('/api/media', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || UPLOAD_FALLBACK_ERROR;
        this.setState({ isUploading: false, errorMessage: errorMsg });
        this.onError?.(errorMsg);
        return null;
      }

      const newMedia = data.media as MediaRecord;
      this.setState({ isUploading: false, errorMessage: null });
      this.onSuccess?.(newMedia);
      this.onRefresh?.();
      return newMedia;
    } catch {
      this.setState({
        isUploading: false,
        errorMessage: UPLOAD_NETWORK_ERROR,
      });
      this.onError?.(UPLOAD_NETWORK_ERROR);
      return null;
    } finally {
      if (inputElement) {
        inputElement.value = '';
      }
    }
  }
}

export function useMediaUpload(callbacks: MediaUploadCallbacks = {}) {
  const { onSuccess, onError } = callbacks;
  const router = useRouter();
  const [state, setState] = useState<MediaUploadState>({
    isUploading: false,
    errorMessage: null,
  });

  const controllerRef = useRef<MediaUploadController | null>(null);

  const getController = useCallback(() => {
    if (controllerRef.current === null) {
      controllerRef.current = new MediaUploadController({
        onRefresh: () => router.refresh(),
        onStateChange: setState,
      });
    }
    return controllerRef.current;
  }, [router]);

  const uploadFile = useCallback(
    async (
      file: File | null | undefined,
      currentCount: number,
      inputElement?: { value: string } | null
    ) => {
      const controller = getController();
      controller.setCallbacks({ onSuccess, onError });
      return await controller.uploadFile(file, currentCount, inputElement);
    },
    [getController, onSuccess, onError]
  );

  const clearError = useCallback(() => {
    getController().clearError();
  }, [getController]);

  return {
    isUploading: state.isUploading,
    errorMessage: state.errorMessage,
    clearError,
    uploadFile,
  };
}
