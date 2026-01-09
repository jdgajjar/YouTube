/**
 * Text Processing Utilities for Search
 * Lightweight implementation without external dependencies
 * Optimized for Render free tier (CPU-only, low memory)
 */

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
  'what', 'when', 'where', 'who', 'which', 'why', 'how', 'can', 'or',
  'not', 'do', 'does', 'did', 'been', 'being', 'am', 'were', 'there',
]);

// Simple stemming rules for common English suffixes
const STEMMING_RULES = [
  { pattern: /ies$/, replacement: 'y' },
  { pattern: /ied$/, replacement: 'y' },
  { pattern: /ing$/, replacement: '' },
  { pattern: /ed$/, replacement: '' },
  { pattern: /es$/, replacement: '' },
  { pattern: /s$/, replacement: '' },
  { pattern: /ly$/, replacement: '' },
];

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Remove stop words from token array
 */
export function removeStopWords(tokens: string[]): string[] {
  return tokens.filter(token => !STOP_WORDS.has(token));
}

/**
 * Simple stemming algorithm
 */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  
  for (const rule of STEMMING_RULES) {
    if (rule.pattern.test(word)) {
      const stemmed = word.replace(rule.pattern, rule.replacement);
      // Avoid words that are too short after stemming
      if (stemmed.length >= 3) {
        return stemmed;
      }
    }
  }
  
  return word;
}

/**
 * Stem all tokens in array
 */
export function stemTokens(tokens: string[]): string[] {
  return tokens.map(stem);
}

/**
 * Complete preprocessing pipeline
 */
export function preprocessText(text: string): string[] {
  const tokens = tokenize(text);
  const withoutStopWords = removeStopWords(tokens);
  const stemmed = stemTokens(withoutStopWords);
  return stemmed;
}

/**
 * Extract keywords from text (most frequent non-stop words)
 */
export function extractKeywords(text: string, topN: number = 10): string[] {
  const tokens = preprocessText(text);
  
  // Count frequency
  const frequency: { [key: string]: number } = {};
  tokens.forEach(token => {
    frequency[token] = (frequency[token] || 0) + 1;
  });
  
  // Sort by frequency and return top N
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Calculate word frequency in document
 */
export function calculateTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const totalTerms = tokens.length;
  
  if (totalTerms === 0) return tf;
  
  tokens.forEach(token => {
    tf.set(token, (tf.get(token) || 0) + 1);
  });
  
  // Normalize by total terms
  tf.forEach((count, term) => {
    tf.set(term, count / totalTerms);
  });
  
  return tf;
}

/**
 * Calculate Jaccard similarity between two token sets
 */
export function calculateJaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  // Calculate dot product and magnitude of vec1
  vec1.forEach((value, key) => {
    magnitude1 += value * value;
    if (vec2.has(key)) {
      dotProduct += value * vec2.get(key)!;
    }
  });
  
  // Calculate magnitude of vec2
  vec2.forEach(value => {
    magnitude2 += value * value;
  });
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Generate n-grams from tokens
 */
export function generateNGrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  
  return ngrams;
}

/**
 * Check if query matches text (fuzzy matching)
 */
export function fuzzyMatch(query: string, text: string, threshold: number = 0.6): boolean {
  const queryTokens = preprocessText(query);
  const textTokens = preprocessText(text);
  
  const similarity = calculateJaccardSimilarity(queryTokens, textTokens);
  return similarity >= threshold;
}
