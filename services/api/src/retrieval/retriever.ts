// services/api/src/retrieval/retriever.ts

export type ContextChunk = {
    id: string;
    text: string;
    score?: number;
  };
  
  export interface Retriever {
    getContext(query: string, k?: number): Promise<ContextChunk[]>;
  }