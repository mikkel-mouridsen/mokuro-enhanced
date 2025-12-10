/**
 * Dictionary Database Service
 * 
 * Manages dictionary data storage using IndexedDB.
 * Inspired by Yomitan's dictionary architecture but adapted for web-native use.
 * 
 * Production-ready features:
 * - Efficient IndexedDB storage for large dictionaries
 * - Support for multiple dictionary formats (Yomitan compatible)
 * - Optimized lookups with proper indexing
 * - Transaction management and error handling
 * - Memory-efficient batch operations
 */

interface DictionaryEntry {
  expression: string;
  reading: string;
  definitionTags?: string;
  rules?: string;
  score: number;
  glossary: (string | { type?: string; content?: string } | any)[];
  sequence: number;
  termTags?: string;
}

interface DictionaryMetadata {
  title: string;
  revision: string;
  sequenced?: boolean;
  format?: number;
  version?: number;
  author?: string;
  url?: string;
  description?: string;
  attribution?: string;
  frequencyMode?: string;
}

interface DictionaryIndex {
  title: string;
  revision: string;
  sequenced: boolean;
  format: number;
  version: number;
  enabled: boolean;
  priority: number;
  allowSecondarySearches: boolean;
}

export class DictionaryDatabaseService {
  private static instance: DictionaryDatabaseService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'mokuro-yomitan-dict';
  private readonly DB_VERSION = 1;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): DictionaryDatabaseService {
    if (!DictionaryDatabaseService.instance) {
      DictionaryDatabaseService.instance = new DictionaryDatabaseService();
    }
    return DictionaryDatabaseService.instance;
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Dictionary database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createSchema(db);
      };
    });

    return this.initPromise;
  }

  /**
   * Create database schema with proper indexes for efficient lookups
   */
  private createSchema(db: IDBDatabase): void {
    // Dictionary metadata store
    if (!db.objectStoreNames.contains('dictionaries')) {
      const dictStore = db.createObjectStore('dictionaries', { keyPath: 'title' });
      dictStore.createIndex('enabled', 'enabled', { unique: false });
      dictStore.createIndex('priority', 'priority', { unique: false });
    }

    // Term dictionary entries
    if (!db.objectStoreNames.contains('terms')) {
      const termStore = db.createObjectStore('terms', { 
        keyPath: ['dictionary', 'expression', 'reading', 'sequence']
      });
      termStore.createIndex('expression', 'expression', { unique: false });
      termStore.createIndex('reading', 'reading', { unique: false });
      termStore.createIndex('dictionary', 'dictionary', { unique: false });
      termStore.createIndex('expressionReading', ['expression', 'reading'], { unique: false });
    }

    // Kanji dictionary entries
    if (!db.objectStoreNames.contains('kanji')) {
      const kanjiStore = db.createObjectStore('kanji', {
        keyPath: ['dictionary', 'character']
      });
      kanjiStore.createIndex('character', 'character', { unique: false });
      kanjiStore.createIndex('dictionary', 'dictionary', { unique: false });
    }

    // Tag metadata
    if (!db.objectStoreNames.contains('tagMeta')) {
      const tagStore = db.createObjectStore('tagMeta', {
        keyPath: ['dictionary', 'name']
      });
      tagStore.createIndex('dictionary', 'dictionary', { unique: false });
    }

    // Frequency data
    if (!db.objectStoreNames.contains('termMeta')) {
      const metaStore = db.createObjectStore('termMeta', {
        keyPath: ['dictionary', 'expression', 'mode', 'data']
      });
      metaStore.createIndex('expression', 'expression', { unique: false });
      metaStore.createIndex('dictionary', 'dictionary', { unique: false });
    }

    console.log('Dictionary database schema created');
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  /**
   * Get all installed dictionaries
   */
  async getDictionaries(): Promise<DictionaryIndex[]> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['dictionaries'], 'readonly');
      const store = transaction.objectStore('dictionaries');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as DictionaryIndex[]);
      };

      request.onerror = () => {
        reject(new Error('Failed to get dictionaries'));
      };
    });
  }

  /**
   * Find term entries in the dictionary
   */
  async findTerms(expression: string, enabledOnly = true): Promise<DictionaryEntry[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['terms', 'dictionaries'], 'readonly');
      const termStore = transaction.objectStore('terms');
      const dictStore = transaction.objectStore('dictionaries');
      
      // Get enabled dictionaries first
      const dictRequest = dictStore.getAll();
      
      dictRequest.onsuccess = () => {
        const dictionaries = dictRequest.result as DictionaryIndex[];
        const enabledDicts = enabledOnly 
          ? dictionaries.filter(d => d.enabled).map(d => d.title)
          : dictionaries.map(d => d.title);

        if (enabledDicts.length === 0) {
          resolve([]);
          return;
        }

        // Look up terms
        const index = termStore.index('expression');
        const request = index.getAll(expression);

        request.onsuccess = () => {
          const allResults = request.result as DictionaryEntry[];
          
          // Filter by enabled dictionaries and sort by score
          const filtered = allResults
            .filter(entry => enabledDicts.includes((entry as any).dictionary))
            .sort((a, b) => b.score - a.score);

          resolve(filtered);
        };

        request.onerror = () => {
          reject(new Error('Failed to find terms'));
        };
      };

      dictRequest.onerror = () => {
        reject(new Error('Failed to get dictionaries'));
      };
    });
  }

  /**
   * Import a dictionary from Yomitan format
   * Supports the standard Yomitan dictionary ZIP structure
   */
  async importDictionary(
    file: File,
    onProgress?: (progress: number, status: string) => void
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      onProgress?.(0, 'Reading dictionary file...');

      // Use JSZip to read the dictionary archive
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);

      // Read index.json for metadata
      const indexFile = zip.file('index.json');
      if (!indexFile) {
        throw new Error('Invalid dictionary format: missing index.json');
      }

      const indexText = await indexFile.async('text');
      const metadata: DictionaryMetadata = JSON.parse(indexText);

      onProgress?.(10, 'Validating dictionary...');

      // Check if dictionary already exists
      const existing = await this.getDictionaryByTitle(metadata.title);
      if (existing) {
        throw new Error(`Dictionary "${metadata.title}" is already installed`);
      }

      // Import dictionary metadata
      const dictIndex: DictionaryIndex = {
        title: metadata.title,
        revision: metadata.revision,
        sequenced: metadata.sequenced || false,
        format: metadata.format || 3,
        version: metadata.version || 3,
        enabled: true,
        priority: 0,
        allowSecondarySearches: true,
      };

      onProgress?.(20, 'Importing dictionary metadata...');
      await this.saveDictionary(dictIndex);

      // Import term banks
      const termBankFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('term_bank_') && name.endsWith('.json')
      );

      if (termBankFiles.length === 0) {
        console.warn('No term banks found in dictionary');
      }

      for (let i = 0; i < termBankFiles.length; i++) {
        const fileName = termBankFiles[i];
        const progress = 20 + ((i / termBankFiles.length) * 60);
        onProgress?.(progress, `Importing terms (${i + 1}/${termBankFiles.length})...`);

        const file = zip.file(fileName);
        if (!file) continue;

        const content = await file.async('text');
        const entries = JSON.parse(content);

        await this.importTermBatch(metadata.title, entries);
      }

      // Import tag banks
      onProgress?.(85, 'Importing tags...');
      const tagBankFiles = Object.keys(zip.files).filter(name =>
        name.startsWith('tag_bank_') && name.endsWith('.json')
      );

      for (const fileName of tagBankFiles) {
        const file = zip.file(fileName);
        if (!file) continue;

        const content = await file.async('text');
        const tags = JSON.parse(content);
        await this.importTagBatch(metadata.title, tags);
      }

      // Import kanji banks (if present)
      onProgress?.(90, 'Importing kanji...');
      const kanjiBankFiles = Object.keys(zip.files).filter(name =>
        name.startsWith('kanji_bank_') && name.endsWith('.json')
      );

      for (const fileName of kanjiBankFiles) {
        const file = zip.file(fileName);
        if (!file) continue;

        const content = await file.async('text');
        const kanji = JSON.parse(content);
        await this.importKanjiBatch(metadata.title, kanji);
      }

      onProgress?.(100, 'Dictionary imported successfully!');
      console.log(`Dictionary "${metadata.title}" imported successfully`);

    } catch (error) {
      console.error('Failed to import dictionary:', error);
      throw error;
    }
  }

  /**
   * Import a batch of term entries
   */
  private async importTermBatch(dictionary: string, entries: any[][]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['terms'], 'readwrite');
      const store = transaction.objectStore('terms');

      // Yomitan format: [expression, reading, definitionTags, rules, score, glossary, sequence, termTags]
      for (const entry of entries) {
        const termEntry = {
          dictionary,
          expression: entry[0],
          reading: entry[1],
          definitionTags: entry[2] || '',
          rules: entry[3] || '',
          score: entry[4] || 0,
          glossary: entry[5] || [],
          sequence: entry[6] || -1,
          termTags: entry[7] || '',
        };

        store.add(termEntry);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to import term batch'));
    });
  }

  /**
   * Import a batch of tag entries
   */
  private async importTagBatch(dictionary: string, tags: any[][]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tagMeta'], 'readwrite');
      const store = transaction.objectStore('tagMeta');

      // Yomitan format: [name, category, order, notes, score]
      for (const tag of tags) {
        const tagEntry = {
          dictionary,
          name: tag[0],
          category: tag[1] || '',
          order: tag[2] || 0,
          notes: tag[3] || '',
          score: tag[4] || 0,
        };

        store.add(tagEntry);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to import tag batch'));
    });
  }

  /**
   * Import a batch of kanji entries
   */
  private async importKanjiBatch(dictionary: string, kanji: any[][]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['kanji'], 'readwrite');
      const store = transaction.objectStore('kanji');

      // Yomitan format: [character, onyomi, kunyomi, tags, meanings, stats]
      for (const entry of kanji) {
        const kanjiEntry = {
          dictionary,
          character: entry[0],
          onyomi: entry[1] || [],
          kunyomi: entry[2] || [],
          tags: entry[3] || '',
          meanings: entry[4] || [],
          stats: entry[5] || {},
        };

        store.add(kanjiEntry);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to import kanji batch'));
    });
  }

  /**
   * Get a dictionary by title
   */
  private async getDictionaryByTitle(title: string): Promise<DictionaryIndex | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['dictionaries'], 'readonly');
      const store = transaction.objectStore('dictionaries');
      const request = store.get(title);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get dictionary'));
      };
    });
  }

  /**
   * Save dictionary metadata
   */
  private async saveDictionary(dictionary: DictionaryIndex): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['dictionaries'], 'readwrite');
      const store = transaction.objectStore('dictionaries');
      const request = store.add(dictionary);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save dictionary'));
    });
  }

  /**
   * Delete a dictionary and all its entries
   */
  async deleteDictionary(title: string): Promise<void> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(
      ['dictionaries', 'terms', 'kanji', 'tagMeta', 'termMeta'],
      'readwrite'
    );

    // Delete from all stores
    const stores = ['terms', 'kanji', 'tagMeta', 'termMeta'];
    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      const index = store.index('dictionary');
      const request = index.openCursor(IDBKeyRange.only(title));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }

    // Delete dictionary metadata
    const dictStore = transaction.objectStore('dictionaries');
    dictStore.delete(title);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`Dictionary "${title}" deleted successfully`);
        resolve();
      };
      transaction.onerror = () => {
        reject(new Error('Failed to delete dictionary'));
      };
    });
  }

  /**
   * Toggle dictionary enabled state
   */
  async toggleDictionary(title: string, enabled: boolean): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['dictionaries'], 'readwrite');
      const store = transaction.objectStore('dictionaries');
      const request = store.get(title);

      request.onsuccess = () => {
        const dict = request.result;
        if (dict) {
          dict.enabled = enabled;
          store.put(dict);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to toggle dictionary'));
    });
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    dictionaries: number;
    terms: number;
    kanji: number;
  }> {
    await this.ensureInitialized();

    const transaction = this.db!.transaction(['dictionaries', 'terms', 'kanji'], 'readonly');
    
    const countStore = (storeName: string): Promise<number> => {
      return new Promise((resolve) => {
        const request = transaction.objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result);
      });
    };

    const [dictionaries, terms, kanji] = await Promise.all([
      countStore('dictionaries'),
      countStore('terms'),
      countStore('kanji'),
    ]);

    return { dictionaries, terms, kanji };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Export singleton instance
export const dictionaryDatabase = DictionaryDatabaseService.getInstance();

