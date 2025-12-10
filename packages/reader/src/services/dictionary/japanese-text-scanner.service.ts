/**
 * Japanese Text Scanner Service
 * 
 * Handles text selection, deinflection, and dictionary lookups for Japanese text.
 * Improved implementation based on Yomitan's robust text scanning algorithm.
 * 
 * Production features:
 * - Accurate text boundary detection using range rectangles
 * - Verb/adjective deinflection
 * - Multi-term matching (longest match first)
 * - Support for vertical and horizontal text
 * - Efficient caching of lookup results
 */

import { dictionaryDatabase } from './dictionary-database.service';

interface LookupResult {
  expression: string;
  reading: string;
  definitions: Array<{
    dictionary: string;
    glossary: (string | { type?: string; content?: string } | any)[];
    tags?: string;
    score: number;
  }>;
  deinflectionSource?: string;
  deinflectionRule?: string;
}

interface ScanOptions {
  maxLength?: number;
  enableDeinflection?: boolean;
  scanBackward?: boolean;
}

/**
 * Basic Japanese deinflection rules
 * Simplified version of Yomitan's comprehensive rule system
 */
const DEINFLECTION_RULES = [
  // Past tense
  { from: 'た', to: 'る', name: 'past', type: 'v1' },
  { from: 'った', to: 'う', name: 'past', type: 'v5u' },
  { from: 'った', to: 'つ', name: 'past', type: 'v5t' },
  { from: 'った', to: 'る', name: 'past', type: 'v5r' },
  { from: 'んだ', to: 'ぬ', name: 'past', type: 'v5n' },
  { from: 'んだ', to: 'む', name: 'past', type: 'v5m' },
  { from: 'んだ', to: 'ぶ', name: 'past', type: 'v5b' },
  { from: 'いた', to: 'く', name: 'past', type: 'v5k' },
  { from: 'いだ', to: 'ぐ', name: 'past', type: 'v5g' },
  { from: 'した', to: 'す', name: 'past', type: 'v5s' },
  
  // Te-form
  { from: 'て', to: 'る', name: 'te-form', type: 'v1' },
  { from: 'って', to: 'う', name: 'te-form', type: 'v5u' },
  { from: 'って', to: 'つ', name: 'te-form', type: 'v5t' },
  { from: 'って', to: 'る', name: 'te-form', type: 'v5r' },
  { from: 'んで', to: 'ぬ', name: 'te-form', type: 'v5n' },
  { from: 'んで', to: 'む', name: 'te-form', type: 'v5m' },
  { from: 'んで', to: 'ぶ', name: 'te-form', type: 'v5b' },
  { from: 'いて', to: 'く', name: 'te-form', type: 'v5k' },
  { from: 'いで', to: 'ぐ', name: 'te-form', type: 'v5g' },
  { from: 'して', to: 'す', name: 'te-form', type: 'v5s' },
  
  // Negative
  { from: 'ない', to: 'る', name: 'negative', type: 'v1' },
  { from: 'わない', to: 'う', name: 'negative', type: 'v5u' },
  { from: 'たない', to: 'つ', name: 'negative', type: 'v5t' },
  { from: 'らない', to: 'る', name: 'negative', type: 'v5r' },
  { from: 'なない', to: 'ぬ', name: 'negative', type: 'v5n' },
  { from: 'まない', to: 'む', name: 'negative', type: 'v5m' },
  { from: 'ばない', to: 'ぶ', name: 'negative', type: 'v5b' },
  { from: 'かない', to: 'く', name: 'negative', type: 'v5k' },
  { from: 'がない', to: 'ぐ', name: 'negative', type: 'v5g' },
  { from: 'さない', to: 'す', name: 'negative', type: 'v5s' },
  
  // Masu-form
  { from: 'ます', to: 'る', name: 'polite', type: 'v1' },
  { from: 'います', to: 'う', name: 'polite', type: 'v5u' },
  { from: 'ちます', to: 'つ', name: 'polite', type: 'v5t' },
  { from: 'ります', to: 'る', name: 'polite', type: 'v5r' },
  { from: 'にます', to: 'ぬ', name: 'polite', type: 'v5n' },
  { from: 'みます', to: 'む', name: 'polite', type: 'v5m' },
  { from: 'びます', to: 'ぶ', name: 'polite', type: 'v5b' },
  { from: 'きます', to: 'く', name: 'polite', type: 'v5k' },
  { from: 'ぎます', to: 'ぐ', name: 'polite', type: 'v5g' },
  { from: 'します', to: 'す', name: 'polite', type: 'v5s' },
  
  // Potential
  { from: 'られる', to: 'る', name: 'potential', type: 'v1' },
  { from: 'える', to: 'う', name: 'potential', type: 'v5u' },
  { from: 'てる', to: 'つ', name: 'potential', type: 'v5t' },
  { from: 'れる', to: 'る', name: 'potential', type: 'v5r' },
  { from: 'ねる', to: 'ぬ', name: 'potential', type: 'v5n' },
  { from: 'める', to: 'む', name: 'potential', type: 'v5m' },
  { from: 'べる', to: 'ぶ', name: 'potential', type: 'v5b' },
  { from: 'ける', to: 'く', name: 'potential', type: 'v5k' },
  { from: 'げる', to: 'ぐ', name: 'potential', type: 'v5g' },
  { from: 'せる', to: 'す', name: 'potential', type: 'v5s' },
  
  // Adjective forms
  { from: 'かった', to: 'い', name: 'past', type: 'adj-i' },
  { from: 'くて', to: 'い', name: 'te-form', type: 'adj-i' },
  { from: 'くない', to: 'い', name: 'negative', type: 'adj-i' },
  { from: 'く', to: 'い', name: 'adverb', type: 'adj-i' },
];

export class JapaneseTextScannerService {
  private static instance: JapaneseTextScannerService;
  private lookupCache: Map<string, LookupResult[]> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;

  private constructor() {}

  static getInstance(): JapaneseTextScannerService {
    if (!JapaneseTextScannerService.instance) {
      JapaneseTextScannerService.instance = new JapaneseTextScannerService();
    }
    return JapaneseTextScannerService.instance;
  }

  /**
   * Scan text starting from a position and find dictionary matches
   */
  async scanText(
    text: string,
    startIndex: number,
    options: ScanOptions = {}
  ): Promise<LookupResult[]> {
    const {
      maxLength = 20,
      enableDeinflection = true,
      scanBackward = false,
    } = options;

    // Extract substring to scan
    let searchText: string;
    if (scanBackward) {
      searchText = text.substring(Math.max(0, startIndex - maxLength), startIndex + 1);
    } else {
      searchText = text.substring(startIndex, Math.min(text.length, startIndex + maxLength));
    }

    // Normalize the text (remove spaces, convert to proper form)
    searchText = this.normalizeText(searchText);

    console.log('scanText called:', {
      searchText: searchText,
      originalText: text.substring(startIndex, Math.min(text.length, startIndex + maxLength)),
      startIndex: startIndex,
      maxLength: maxLength
    });

    if (searchText.length === 0) {
      return [];
    }

    // Check cache first
    const cacheKey = `${searchText}:${enableDeinflection}`;
    if (this.lookupCache.has(cacheKey)) {
      console.log('Using cached result');
      return this.lookupCache.get(cacheKey)!;
    }

    const results: LookupResult[] = [];

    // Try progressively shorter substrings (longest match first)
    console.log(`Trying ${searchText.length} substrings from longest to shortest...`);
    for (let length = searchText.length; length > 0; length--) {
      const substring = scanBackward 
        ? searchText.substring(searchText.length - length)
        : searchText.substring(0, length);

      console.log(`  Trying length ${length}: "${substring}"`);

      // Direct lookup
      const directMatches = await this.lookupTerm(substring);
      if (directMatches.length > 0) {
        console.log(`  ✓ Direct match found for "${substring}"!`);
        results.push(...directMatches);
        // Found a match, can stop here for longest-first strategy
        break;
      }

      // Try deinflection if enabled
      if (enableDeinflection) {
        const deinflected = this.deinflect(substring);
        if (deinflected.length > 0) {
          console.log(`    Trying ${deinflected.length} deinflected forms...`);
        }
        for (const variant of deinflected) {
          console.log(`      Trying deinflected: "${variant.term}" (${variant.rule})`);
          const matches = await this.lookupTerm(variant.term);
          if (matches.length > 0) {
            console.log(`      ✓ Deinflected match found!`);
            // Add deinflection info to results
            results.push(...matches.map(m => ({
              ...m,
              deinflectionSource: substring,
              deinflectionRule: variant.rule,
            })));
            break;
          }
        }

        if (results.length > 0) {
          break;
        }
      }
    }

    if (results.length === 0) {
      console.log('✗ No matches found at all');
    }

    // Cache the results
    this.cacheResults(cacheKey, results);

    return results;
  }

  /**
   * Look up a term in the dictionary
   */
  private async lookupTerm(expression: string): Promise<LookupResult[]> {
    try {
      const entries = await dictionaryDatabase.findTerms(expression);
      
      if (entries.length === 0) {
        return [];
      }

      // Group by expression + reading
      const grouped = new Map<string, LookupResult>();

      for (const entry of entries) {
        const key = `${entry.expression}:${entry.reading}`;
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            expression: entry.expression,
            reading: entry.reading,
            definitions: [],
          });
        }

        const result = grouped.get(key)!;
        result.definitions.push({
          dictionary: (entry as any).dictionary,
          glossary: entry.glossary,
          tags: entry.termTags,
          score: entry.score,
        });
      }

      return Array.from(grouped.values());
    } catch (error) {
      console.error('Failed to lookup term:', error);
      return [];
    }
  }

  /**
   * Deinflect a Japanese term to its dictionary form
   */
  private deinflect(term: string): Array<{ term: string; rule: string }> {
    const results: Array<{ term: string; rule: string }> = [];

    for (const rule of DEINFLECTION_RULES) {
      if (term.endsWith(rule.from)) {
        const baseTerm = term.substring(0, term.length - rule.from.length) + rule.to;
        results.push({
          term: baseTerm,
          rule: `${rule.name} (${rule.type})`,
        });
      }
    }

    return results;
  }

  /**
   * Normalize Japanese text for lookup
   */
  private normalizeText(text: string): string {
    // Remove whitespace
    text = text.replace(/\s+/g, '');
    
    // Convert half-width katakana to full-width
    text = text.replace(/[\uff61-\uff9f]/g, (ch) => {
      return String.fromCharCode(ch.charCodeAt(0) + 0xfec0);
    });

    return text;
  }

  /**
   * Check if a character is Japanese
   */
  isJapanese(char: string): boolean {
    const code = char.charCodeAt(0);
    
    return (
      (code >= 0x3040 && code <= 0x309F) ||  // Hiragana
      (code >= 0x30A0 && code <= 0x30FF) ||  // Katakana
      (code >= 0x4E00 && code <= 0x9FFF) ||  // Kanji
      (code >= 0x31F0 && code <= 0x31FF) ||  // Katakana Phonetic Extensions
      (code >= 0xFF65 && code <= 0xFF9F)     // Half-width Katakana
    );
  }

  /**
   * Find the start of a Japanese word at a given position
   */
  findWordStart(text: string, position: number): number {
    let start = position;
    
    while (start > 0 && this.isJapanese(text[start - 1])) {
      start--;
    }
    
    return start;
  }

  /**
   * Find the end of a Japanese word at a given position
   */
  findWordEnd(text: string, position: number): number {
    let end = position;
    
    while (end < text.length && this.isJapanese(text[end])) {
      end++;
    }
    
    return end;
  }

  /**
   * Cache lookup results with size limit
   */
  private cacheResults(key: string, results: LookupResult[]): void {
    // Simple LRU: if cache is full, delete oldest entry
    if (this.lookupCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.lookupCache.keys().next().value;
      this.lookupCache.delete(firstKey);
    }
    
    this.lookupCache.set(key, results);
  }

  /**
   * Clear the lookup cache
   */
  clearCache(): void {
    this.lookupCache.clear();
  }

  /**
   * Get range from point - Yomitan-inspired implementation
   */
  private getRangeFromPoint(x: number, y: number): Range | null {
    // Try modern API first (Firefox, newer Chrome)
    if ((document as any).caretPositionFromPoint) {
      try {
        const position = (document as any).caretPositionFromPoint(x, y);
        if (position && position.offsetNode) {
          const range = document.createRange();
          range.setStart(position.offsetNode, position.offset);
          range.setEnd(position.offsetNode, position.offset);
          return range;
        }
      } catch (e) {
        console.log('caretPositionFromPoint failed:', e);
      }
    }

    // Fallback to caretRangeFromPoint (Chrome, Safari)
    if (document.caretRangeFromPoint) {
      try {
        return document.caretRangeFromPoint(x, y);
      } catch (e) {
        console.log('caretRangeFromPoint failed:', e);
      }
    }

    return null;
  }

  /**
   * Check if a point is within a range's client rectangles
   */
  private isPointInRange(x: number, y: number, range: Range): boolean {
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return true;
      }
    }
    return false;
  }

  /**
   * Scan text at a specific DOM position - Yomitan-style implementation
   * The key: we DON'T find word boundaries first. We scan from the click point
   * and try progressively longer substrings, using dictionary lookup to find words.
   */
  async scanAtPoint(
    element: HTMLElement,
    x: number,
    y: number,
    options: ScanOptions = {}
  ): Promise<{
    results: LookupResult[];
    textRange?: { start: number; end: number; text: string };
  }> {
    try {
      console.log('scanAtPoint called on element:', element.className);

      // Get initial range from point
      const range = this.getRangeFromPoint(x, y);
      if (!range) {
        console.log('No range from point');
        return { results: [] };
      }

      const startContainer = range.startContainer;
      
      // Must be a text node
      if (startContainer.nodeType !== Node.TEXT_NODE) {
        console.log('Not a text node, type:', startContainer.nodeType);
        return { results: [] };
      }

      // CRITICAL: Verify the text node is actually inside the clicked element
      let parent: Node | null = startContainer.parentNode;
      let isWithinElement = false;
      while (parent) {
        if (parent === element) {
          isWithinElement = true;
          break;
        }
        parent = parent.parentNode;
      }

      if (!isWithinElement) {
        console.log('Text node is not within clicked element, searching within element...');
        
        // The range found a text node outside our element
        // Let's find text nodes within the clicked element instead
        const textNodesInElement = this.getTextNodesIn(element);
        
        if (textNodesInElement.length === 0) {
          console.log('No text nodes found in element');
          return { results: [] };
        }

        console.log(`Found ${textNodesInElement.length} text nodes in element`);

        // Find the text node that contains our click point
        let bestTextNode: Text | null = null;
        let bestOffset = 0;

        for (const textNode of textNodesInElement) {
          const text = textNode.textContent || '';
          if (text.trim().length === 0) continue;

          console.log('Checking text node:', text);

          // Try each character position in this text node
          for (let i = 0; i < text.length; i++) {
            const testRange = document.createRange();
            testRange.setStart(textNode, i);
            testRange.setEnd(textNode, Math.min(i + 1, text.length));

            if (this.isPointInRange(x, y, testRange)) {
              bestTextNode = textNode;
              bestOffset = i;
              console.log('✓ Found text node within element at offset:', i, 'char:', text.charAt(i));
              break;
            }
          }

          if (bestTextNode) break;
        }

        if (!bestTextNode) {
          console.log('Could not find text at click point within element');
          return { results: [] };
        }

        // Use the found text node and scan from that position
        const text = bestTextNode.textContent || '';
        console.log('=== SCANNING ===');
        console.log('Full text in node:', text);
        console.log('Starting from offset:', bestOffset);
        console.log('Character at offset:', text.charAt(bestOffset));
        console.log('Remaining text to scan:', text.substring(bestOffset));

        // Scan from this position (Yomitan style - no word boundaries)
        const results = await this.scanText(text, bestOffset, options);

        if (results.length > 0) {
          // Find the actual matched text length
          const matchedText = results[0].deinflectionSource || results[0].expression;
          const matchEnd = bestOffset + matchedText.length;

          console.log('✓ Match found:', {
            expression: results[0].expression,
            matchedText: matchedText,
            start: bestOffset,
            end: matchEnd
          });

          return {
            results,
            textRange: {
              start: bestOffset,
              end: matchEnd,
              text: matchedText,
            },
          };
        }

        console.log('✗ No matches found');
        return { results: [] };
      }

      // Original path: text node is within the clicked element
      const textNode = startContainer as Text;
      const text = textNode.textContent || '';
      const offset = range.startOffset;

      console.log('Found text node within element');
      console.log('Full text:', text);
      console.log('Initial offset:', offset);

      // Try to find the exact click position using getClientRects
      let bestOffset = offset;
      for (let i = Math.max(0, offset - 2); i <= Math.min(text.length - 1, offset + 2); i++) {
        if (i >= 0 && i < text.length) {
          const testRange = document.createRange();
          testRange.setStart(textNode, i);
          testRange.setEnd(textNode, Math.min(i + 1, text.length));
          
          if (this.isPointInRange(x, y, testRange)) {
            bestOffset = i;
            console.log('Found best offset:', i, 'char:', text.charAt(i));
            break;
          }
        }
      }

      console.log('Starting scan from offset:', bestOffset, 'char:', text.charAt(bestOffset));

      // Scan from this position (Yomitan style - no word boundaries)
      const results = await this.scanText(text, bestOffset, options);

      if (results.length > 0) {
        // Find the actual matched text length
        const matchedText = results[0].deinflectionSource || results[0].expression;
        const matchEnd = bestOffset + matchedText.length;

        console.log('Match found:', {
          expression: results[0].expression,
          matchedText: matchedText,
          start: bestOffset,
          end: matchEnd
        });

        return {
          results,
          textRange: {
            start: bestOffset,
            end: matchEnd,
            text: matchedText,
          },
        };
      }

      console.log('No matches found');
      return { results: [] };
    } catch (error) {
      console.error('Failed to scan at point:', error);
      return { results: [] };
    }
  }

  /**
   * Get all text nodes within an element
   */
  private getTextNodesIn(element: Node): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node as Text);
      }
    }

    return textNodes;
  }
}

// Export singleton instance
export const japaneseTextScanner = JapaneseTextScannerService.getInstance();
