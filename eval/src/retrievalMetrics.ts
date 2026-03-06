export type RetrievalMetrics = {
    recallAtK: number;
    mrr: number;
  };
  
  export function computeRetrievalMetrics(
    expectedIds: string[],
    retrievedIds: string[]
  ): RetrievalMetrics {
  
    if (!expectedIds || expectedIds.length === 0) {
      return { recallAtK: 0, mrr: 0 };
    }
  
    let recallAtK = 0;
    let mrr = 0;
  
    for (let i = 0; i < retrievedIds.length; i++) {
  
      const id = retrievedIds[i];
  
      if (!id) continue;   // <-- fixes the TS error
  
      if (expectedIds.includes(id)) {
  
        recallAtK = 1;
  
        // Mean Reciprocal Rank
        mrr = 1 / (i + 1);
  
        break;
      }
    }
  
    return { recallAtK, mrr };
  }