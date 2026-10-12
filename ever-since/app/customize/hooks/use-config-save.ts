'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export const SAVE_FEEDBACK_DURATION_MS = 2500;
export const NETWORK_ERROR_MESSAGE =
  'A network error occurred while saving. Please try again.';

export interface ConfigSavePayload {
  anniversaryDate?: string;
  sealMediaId?: string | null;
}

export interface ConfigSaveState {
  isSaving: boolean;
  isSaved: boolean;
  errorMessage: string | null;
}

export interface ConfigSaveControllerOptions {
  fallbackErrorMessage: string;
  fetchImpl?: typeof fetch;
  onRefresh?: () => void;
  onStateChange?: (state: ConfigSaveState) => void;
}

export class ConfigSaveController {
  private fallbackErrorMessage: string;
  private fetchImpl: typeof fetch;
  private onRefresh?: () => void;
  private onStateChange?: (state: ConfigSaveState) => void;
  private state: ConfigSaveState = {
    isSaving: false,
    isSaved: false,
    errorMessage: null,
  };

  constructor(options: ConfigSaveControllerOptions) {
    this.fallbackErrorMessage = options.fallbackErrorMessage;
    this.fetchImpl =
      options.fetchImpl ??
      ((...args: Parameters<typeof fetch>) => fetch(...args));
    this.onRefresh = options.onRefresh;
    this.onStateChange = options.onStateChange;
  }

  public getState(): ConfigSaveState {
    return { ...this.state };
  }

  private setState(partial: Partial<ConfigSaveState>) {
    this.state = { ...this.state, ...partial };
    this.onStateChange?.(this.getState());
  }

  public clearError(): void {
    this.setState({ errorMessage: null });
  }

  public clearSaved(): void {
    this.setState({ isSaved: false });
  }

  public async submit(payload: ConfigSavePayload): Promise<boolean> {
    this.setState({
      isSaving: true,
      isSaved: false,
      errorMessage: null,
    });

    try {
      const response = await this.fetchImpl('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.setState({
          isSaving: false,
          errorMessage: data.error || this.fallbackErrorMessage,
        });
        return false;
      }

      this.setState({
        isSaving: false,
        isSaved: true,
      });
      this.onRefresh?.();
      return true;
    } catch {
      this.setState({
        isSaving: false,
        errorMessage: NETWORK_ERROR_MESSAGE,
      });
      return false;
    }
  }
}

export function useConfigSave(fallbackErrorMessage: string) {
  const router = useRouter();
  const [state, setState] = useState<ConfigSaveState>({
    isSaving: false,
    isSaved: false,
    errorMessage: null,
  });

  const controllerRef = useRef<ConfigSaveController | null>(null);

  const getController = useCallback(() => {
    if (controllerRef.current === null) {
      controllerRef.current = new ConfigSaveController({
        fallbackErrorMessage,
        onRefresh: () => router.refresh(),
        onStateChange: setState,
      });
    }
    return controllerRef.current;
  }, [fallbackErrorMessage, router]);

  useEffect(() => {
    if (state.isSaved) {
      const timer = setTimeout(() => {
        getController().clearSaved();
      }, SAVE_FEEDBACK_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [state.isSaved, getController]);

  const submitConfig = useCallback(
    async (payload: ConfigSavePayload) => {
      return await getController().submit(payload);
    },
    [getController]
  );

  const clearError = useCallback(() => {
    getController().clearError();
  }, [getController]);

  return {
    isSaving: state.isSaving,
    isSaved: state.isSaved,
    errorMessage: state.errorMessage,
    clearError,
    submitConfig,
  };
}
