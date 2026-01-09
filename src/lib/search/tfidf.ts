/**
 * TF-IDF (Term Frequency-Inverse Document Frequency) Implementation
 * Lightweight, CPU-efficient implementation for Render free tier
 */

import { preprocessText, calculateTermFrequency } from './text-processor';

export interface Document {
  id: string;
  text: string;
  tokens?: string[];
  tf?: Map<string, number>;
}

export interface TFIDFResult {
  documentId: string;
  score: number;
  matchedTerms: string[];
}

export class TFIDFCalculator {
  private documents: Map<string, Document> = new Map();
  private idf: Map<string, number> = new Map();
  private documentCount: number = 0;

  /**
   * Add a document to the corpus
   */
  addDocument(id: string, text: string): void {
    const tokens = preprocessText(text);
    const tf = calculateTermFrequency(tokens);
    
    this.documents.set(id, { id, text, tokens, tf });
    this.documentCount++;
  }

  /**
   * Add multiple documents at once
   */
  addDocuments(docs: Array<{ id: string; text: string }>): void {
    docs.forEach(doc => this.addDocument(doc.id, doc.text));
  }

  /**
   * Build IDF scores for all terms in corpus
   */
  buildIDF(): void {
    const termDocumentCount = new Map<string, number>();
    
    // Count how many documents contain each term
    this.documents.forEach(doc => {
      const uniqueTerms = new Set(doc.tokens || []);
      uniqueTerms.forEach(term => {
        termDocumentCount.set(term, (termDocumentCount.get(term) || 0) + 1);
      });
    });
    
    // Calculate IDF: log(total documents / documents containing term)
    termDocumentCount.forEach((docCount, term) => {
      const idfScore = Math.log((this.documentCount + 1) / (docCount + 1)) + 1;
      this.idf.set(term, idfScore);
    });
  }

  /**
   * Calculate TF-IDF score for a document given a query
   */
  calculateScore(documentId: string, queryTokens: string[]): number {
    const doc = this.documents.get(documentId);
    if (!doc || !doc.tf) return 0;
    
    let score = 0;
    const queryTerms = new Set(queryTokens);
    
    queryTerms.forEach(term => {
      const tf = doc.tf!.get(term) || 0;
      const idf = this.idf.get(term) || 0;
      score += tf * idf;
    });
    
    return score;
  }

  /**
   * Search documents by query and return ranked results
   */
  search(query: string, topN: number = 20): TFIDFResult[] {
    const queryTokens = preprocessText(query);
    const results: TFIDFResult[] = [];
    
    this.documents.forEach((doc, id) => {
      const score = this.calculateScore(id, queryTokens);
      if (score > 0) {
        const matchedTerms = queryTokens.filter(term => 
          doc.tokens?.includes(term)
        );
        results.push({ documentId: id, score, matchedTerms });
      }
    });
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, topN);
  }

  /**
   * Get document by ID
   */
  getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
    this.idf.clear();
    this.documentCount = 0;
  }

  /**
   * Get total document count
   */
  getDocumentCount(): number {
    return this.documentCount;
  }
}

/**
 * Calculate TF-IDF for multi-field documents (title, description, tags)
 */
export class MultiFieldTFIDF {
  private calculators: Map<string, TFIDFCalculator> = new Map();
  private weights: Map<string, number> = new Map();

  constructor(fields: Array<{ name: string; weight: number }>) {
    fields.forEach(field => {
      this.calculators.set(field.name, new TFIDFCalculator());
      this.weights.set(field.name, field.weight);
    });
  }

  /**
   * Add a multi-field document
   */
  addDocument(id: string, fields: { [key: string]: string }): void {
    this.calculators.forEach((calculator, fieldName) => {
      const text = fields[fieldName] || '';
      calculator.addDocument(id, text);
    });
  }

  /**
   * Build IDF for all fields
   */
  buildIDF(): void {
    this.calculators.forEach(calculator => calculator.buildIDF());
  }

  /**
   * Search across all fields with weighted scoring
   */
  search(query: string, topN: number = 20): TFIDFResult[] {
    const queryTokens = preprocessText(query);
    const combinedScores = new Map<string, { score: number; matchedTerms: Set<string> }>();
    
    // Calculate weighted scores for each field
    this.calculators.forEach((calculator, fieldName) => {
      const weight = this.weights.get(fieldName) || 1;
      const results = calculator.search(query, 1000); // Get all results
      
      results.forEach(result => {
        const existing = combinedScores.get(result.documentId);
        const weightedScore = result.score * weight;
        
        if (existing) {
          existing.score += weightedScore;
          result.matchedTerms.forEach(term => existing.matchedTerms.add(term));
        } else {
          combinedScores.set(result.documentId, {
            score: weightedScore,
            matchedTerms: new Set(result.matchedTerms),
          });
        }
      });
    });
    
    // Convert to array and sort
    const results: TFIDFResult[] = Array.from(combinedScores.entries()).map(
      ([documentId, data]) => ({
        documentId,
        score: data.score,
        matchedTerms: Array.from(data.matchedTerms),
      })
    );
    
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, topN);
  }

  /**
   * Clear all calculators
   */
  clear(): void {
    this.calculators.forEach(calculator => calculator.clear());
  }
}

/**
 * Create a simple TF-IDF scorer without maintaining corpus
 * Useful for on-the-fly scoring
 */
export function calculateTFIDFScore(
  query: string,
  document: string,
  corpusSize: number,
  termDocumentFrequencies: Map<string, number>
): number {
  const queryTokens = preprocessText(query);
  const docTokens = preprocessText(document);
  const docTF = calculateTermFrequency(docTokens);
  
  let score = 0;
  
  queryTokens.forEach(term => {
    const tf = docTF.get(term) || 0;
    const docFreq = termDocumentFrequencies.get(term) || 1;
    const idf = Math.log((corpusSize + 1) / (docFreq + 1)) + 1;
    
    score += tf * idf;
  });
  
  return score;
}
