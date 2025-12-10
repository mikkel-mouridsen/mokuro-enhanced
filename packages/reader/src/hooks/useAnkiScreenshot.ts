import { useCallback, useRef } from 'react';
import { ankiConnectService } from '../services/anki-connect.service';

export interface AnkiScreenshotOptions {
  enabled: boolean;
  fieldName: string;
  imageFormat?: 'png' | 'jpeg';
  imageQuality?: number;
  maxCardAgeMinutes?: number;
}

export interface UseAnkiScreenshotResult {
  captureAndAddToLastCard: (imageElement: HTMLImageElement) => Promise<void>;
  isProcessing: boolean;
  lastError: Error | null;
}

/**
 * Hook to capture manga page screenshots and add them to the most recent Anki card
 * Based on the inspiration/reader implementation - MANUAL trigger only
 */
export function useAnkiScreenshot(options: AnkiScreenshotOptions): UseAnkiScreenshotResult {
  const {
    enabled,
    fieldName,
    imageFormat = 'jpeg',
    imageQuality = 0.8,
    maxCardAgeMinutes = 5,
  } = options;

  const isProcessingRef = useRef(false);
  const lastErrorRef = useRef<Error | null>(null);

  /**
   * Capture the current page as a base64 image
   */
  const capturePageImage = useCallback(
    async (imageElement: HTMLImageElement): Promise<string> => {
      return new Promise((resolve, reject) => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = imageElement.naturalWidth || imageElement.width;
          canvas.height = imageElement.naturalHeight || imageElement.height;

          ctx.drawImage(imageElement, 0, 0);

          const mimeType = imageFormat === 'png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, imageQuality);
          const base64Data = dataUrl.split(',')[1];

          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      });
    },
    [imageFormat, imageQuality]
  );

  /**
   * Manually capture the current page and add it to the last created Anki card
   */
  const captureAndAddToLastCard = useCallback(
    async (imageElement: HTMLImageElement): Promise<void> => {
      if (!enabled) {
        throw new Error('Anki screenshot feature is disabled in settings');
      }

      if (isProcessingRef.current) {
        throw new Error('Already processing a screenshot');
      }

      isProcessingRef.current = true;
      lastErrorRef.current = null;

      try {
        // Check if AnkiConnect is available
        const isConnected = await ankiConnectService.isConnected();
        if (!isConnected) {
          throw new Error('Cannot connect to AnkiConnect. Make sure Anki is running with AnkiConnect installed.');
        }

        // Get the most recently added note
        const lastNote = await ankiConnectService.getLastAddedNote();
        
        if (!lastNote) {
          throw new Error('No recently added Anki cards found (checked cards added today)');
        }

        console.log('Last note retrieved:', lastNote);

        // Check card age (card noteId is timestamp in milliseconds)
        const cardAgeMinutes = Math.floor((Date.now() - lastNote.noteId) / 60000);
        if (cardAgeMinutes >= maxCardAgeMinutes) {
          throw new Error(`Last card was created ${cardAgeMinutes} minutes ago (maximum age: ${maxCardAgeMinutes} minutes)`);
        }

        console.log(`Found recent card (ID: ${lastNote.noteId}, age: ${cardAgeMinutes} min), adding screenshot...`);

        // Capture the page image
        const imageBase64 = await capturePageImage(imageElement);

        // Generate a filename (use note ID like inspiration/reader does)
        const extension = imageFormat === 'png' ? 'png' : 'jpg';
        const fileName = `mokuro_${lastNote.noteId}.${extension}`;

        // Add image to the note
        await ankiConnectService.addImageToNote(
          lastNote.noteId,
          fieldName,
          imageBase64,
          fileName
        );

        console.log(`Successfully added screenshot to card ${lastNote.noteId}`);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        lastErrorRef.current = errorObj;
        console.error('Error adding screenshot to Anki:', errorObj);
        throw errorObj;
      } finally {
        isProcessingRef.current = false;
      }
    },
    [enabled, fieldName, capturePageImage, imageFormat, maxCardAgeMinutes]
  );

  return {
    captureAndAddToLastCard,
    isProcessing: isProcessingRef.current,
    lastError: lastErrorRef.current,
  };
}
