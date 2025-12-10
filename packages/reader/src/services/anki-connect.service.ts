/**
 * Service for communicating with AnkiConnect
 */
export interface AnkiConnectConfig {
  url: string;
  apiKey?: string;
}

export interface AnkiNote {
  noteId: number; // AnkiConnect returns 'noteId', not 'id'
  fields: Record<string, { value: string; order: number }>;
  modelName: string;
  tags: string[];
}

export class AnkiConnectService {
  private config: AnkiConnectConfig;

  constructor(config: AnkiConnectConfig = { url: 'http://localhost:8765' }) {
    this.config = config;
  }

  /**
   * Invoke an AnkiConnect API action
   */
  private async invoke(action: string, params: any = {}): Promise<any> {
    const requestBody = {
      action,
      version: 6,
      params,
    };

    if (this.config.apiKey) {
      (requestBody as any).key = this.config.apiKey;
    }

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`AnkiConnect request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`AnkiConnect error: ${data.error}`);
      }

      return data.result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Cannot connect to AnkiConnect. Make sure Anki is running and AnkiConnect is installed.');
        }
        throw error;
      }
      throw new Error('Unknown error occurred while connecting to AnkiConnect');
    }
  }

  /**
   * Check if AnkiConnect is running and accessible
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.invoke('version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get AnkiConnect version
   */
  async getVersion(): Promise<number> {
    return await this.invoke('version');
  }

  /**
   * Find notes matching a query
   * @param query - Anki search query (e.g., "added:1" for notes added in the last day)
   */
  async findNotes(query: string): Promise<number[]> {
    return await this.invoke('findNotes', { query });
  }

  /**
   * Get information about notes
   */
  async notesInfo(noteIds: number[]): Promise<AnkiNote[]> {
    return await this.invoke('notesInfo', { notes: noteIds });
  }

  /**
   * Get the most recently added note
   */
  async getLastAddedNote(): Promise<AnkiNote | null> {
    try {
      // Find notes added in the last day (in seconds)
      const noteIds = await this.findNotes('added:1');
      
      if (!noteIds || noteIds.length === 0) {
        console.log('No notes found added today');
        return null;
      }

      // Get the most recent note (last in the array)
      const latestNoteId = noteIds[noteIds.length - 1];
      
      if (!latestNoteId) {
        console.log('Latest note ID is undefined');
        return null;
      }
      
      console.log(`Found ${noteIds.length} notes added today, latest ID: ${latestNoteId}`);
      
      const notesInfo = await this.notesInfo([latestNoteId]);

      if (!notesInfo || notesInfo.length === 0) {
        console.log('No note info returned for ID:', latestNoteId);
        return null;
      }

      const note = notesInfo[0];
      console.log('Note info received:', JSON.stringify(note, null, 2));
      
      // AnkiConnect returns noteId, but we need to make sure it exists
      if (!note || (!note.noteId && typeof note.noteId !== 'number')) {
        console.error('Note has no noteId property:', note);
        return null;
      }

      return note;
    } catch (error) {
      console.error('Error getting last added note:', error);
      return null;
    }
  }

  /**
   * Store a media file in Anki's media collection
   * @param fileName - Name of the file (e.g., "page_screenshot.png")
   * @param dataBase64 - Base64-encoded file data
   * @returns The actual filename used (may be different if there was a conflict)
   */
  async storeMediaFile(fileName: string, dataBase64: string): Promise<string> {
    return await this.invoke('storeMediaFile', {
      filename: fileName,
      data: dataBase64,
    });
  }

  /**
   * Update fields of an existing note
   * @param noteId - ID of the note to update
   * @param fields - Fields to update with their new values
   */
  async updateNoteFields(
    noteId: number,
    fields: Record<string, string>
  ): Promise<void> {
    await this.invoke('updateNoteFields', {
      note: {
        id: noteId,
        fields,
      },
    });
  }

  /**
   * Add an image to a note's field
   * @param noteId - ID of the note
   * @param fieldName - Name of the field to add the image to (e.g., "Picture")
   * @param imageDataBase64 - Base64-encoded image data
   * @param fileName - Name for the image file
   */
  async addImageToNote(
    noteId: number,
    fieldName: string,
    imageDataBase64: string,
    fileName: string
  ): Promise<void> {
    console.log('addImageToNote called with noteId:', noteId, 'fieldName:', fieldName);
    
    if (!noteId || typeof noteId !== 'number') {
      throw new Error(`Invalid note ID: ${noteId}`);
    }
    
    // Store the media file
    const storedFileName = await this.storeMediaFile(fileName, imageDataBase64);

    // Get current note info
    const notesInfo = await this.notesInfo([noteId]);
    console.log('notesInfo response:', JSON.stringify(notesInfo, null, 2));
    
    if (notesInfo.length === 0) {
      throw new Error(`Note with ID ${noteId} not found`);
    }

    const note = notesInfo[0];
    
    // Check if note.fields exists and is an object
    if (!note.fields || typeof note.fields !== 'object') {
      throw new Error(`Note ${noteId} has invalid field data. Note structure: ${JSON.stringify(note)}`);
    }
    
    // Check if field exists
    if (!(fieldName in note.fields)) {
      throw new Error(`Field "${fieldName}" not found in note. Available fields: ${Object.keys(note.fields).join(', ')}`);
    }

    // Get current field value and append the image
    const currentValue = note.fields[fieldName].value;
    const imageTag = `<img src="${storedFileName}">`;
    
    // Append image to field (with a line break if field already has content)
    const newValue = currentValue
      ? `${currentValue}<br>${imageTag}`
      : imageTag;

    // Update the field
    await this.updateNoteFields(noteId, {
      [fieldName]: newValue,
    });
  }

  /**
   * Configure the service
   */
  configure(config: Partial<AnkiConnectConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const ankiConnectService = new AnkiConnectService();

