/**
 * Use Dictionary Lookup Hook
 * 
 * Custom React hook for integrating dictionary lookup functionality
 * into the manga reader. Handles text selection, lookup, and popup state.
 * 
 * Production features:
 * - Touch and mouse event handling
 * - Debouncing for performance
 * - Automatic popup positioning
 * - Loading and error states
 * - Mobile-optimized interactions
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { japaneseTextScanner } from '../services/dictionary/japanese-text-scanner.service';
import { dictionaryDatabase } from '../services/dictionary/dictionary-database.service';

interface DictionaryEntry {
  expression: string;
  reading: string;
  definitions: Array<{
    dictionary: string;
    glossary: (string | { type: string; content: string } | any)[];
    tags?: string;
    score: number;
  }>;
  deinflectionSource?: string;
  deinflectionRule?: string;
}

interface PopupState {
  open: boolean;
  entries: DictionaryEntry[];
  position: { x: number; y: number };
}

interface UseDictionaryLookupOptions {
  enabled?: boolean;
  enableDeinflection?: boolean;
  maxScanLength?: number;
}

interface UseDictionaryLookupReturn {
  popupState: PopupState;
  isLoading: boolean;
  error: string | null;
  hasActiveDictionaries: boolean;
  handleTextInteraction: (event: React.MouseEvent | React.TouchEvent) => void;
  closePopup: () => void;
  clearError: () => void;
}

export const useDictionaryLookup = (
  options: UseDictionaryLookupOptions = {}
): UseDictionaryLookupReturn => {
  const {
    enabled = true,
    enableDeinflection = true,
    maxScanLength = 20,
  } = options;

  const [popupState, setPopupState] = useState<PopupState>({
    open: false,
    entries: [],
    position: { x: 0, y: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveDictionaries, setHasActiveDictionaries] = useState(false);

  // Track if we should prevent panning (when clicking on text)
  const preventPanRef = useRef(false);

  // Check if there are active dictionaries
  useEffect(() => {
    const checkDictionaries = async () => {
      try {
        await dictionaryDatabase.initialize();
        const dicts = await dictionaryDatabase.getDictionaries();
        setHasActiveDictionaries(dicts.some(d => d.enabled));
      } catch (err) {
        console.error('Failed to check dictionaries:', err);
        setHasActiveDictionaries(false);
      }
    };

    checkDictionaries();
  }, []);

  /**
   * Perform dictionary lookup at a specific position
   */
  const performLookup = useCallback(async (
    element: HTMLElement,
    x: number,
    y: number
  ) => {
    if (!enabled || !hasActiveDictionaries) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await japaneseTextScanner.scanAtPoint(
        element,
        x,
        y,
        {
          maxLength: maxScanLength,
          enableDeinflection,
        }
      );

      if (result.results.length > 0) {
        setPopupState({
          open: true,
          entries: result.results,
          position: { x, y },
        });
      } else {
        // No results found - don't show popup
        setPopupState(prev => ({ ...prev, open: false }));
      }
    } catch (err) {
      console.error('Dictionary lookup failed:', err);
      setError(err instanceof Error ? err.message : 'Dictionary lookup failed');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, hasActiveDictionaries, maxScanLength, enableDeinflection]);

  /**
   * Handle click/tap on text (unified for desktop and mobile)
   */
  const handleTextClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Get the actual OCR text box element
    const target = event.target as HTMLElement;
    const textBox = target.closest('.ocr-text-box') as HTMLElement;
    
    if (!textBox) {
      console.log('No text box found');
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get coordinates
    let clientX: number, clientY: number;
    if ('touches' in event) {
      if (event.type === 'touchend' && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      } else if (event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        return;
      }
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    console.log('Lookup at coordinates:', { clientX, clientY }, 'in element:', textBox.className);

    // Pass the text box element (not the child)
    performLookup(textBox, clientX, clientY);
  }, [performLookup]);

  /**
   * Universal text interaction handler
   */
  const handleTextInteraction = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in event) {
      // Touch event - only handle touchend (tap)
      if (event.type === 'touchend') {
        handleTextClick(event);
      }
    } else {
      // Mouse event - handle click
      if (event.type === 'click') {
        handleTextClick(event);
      }
    }
  }, [handleTextClick]);

  /**
   * Close the popup
   */
  const closePopup = useCallback(() => {
    setPopupState(prev => ({ ...prev, open: false }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    popupState,
    isLoading,
    error,
    hasActiveDictionaries,
    handleTextInteraction,
    closePopup,
    clearError,
  };
};

