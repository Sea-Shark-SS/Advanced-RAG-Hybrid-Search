import { DocumentItem, Chunk } from '../types/rag';

export function chunkDocuments(
  documents: DocumentItem[],
  chunkSize: number = 300,
  chunkOverlap: number = 40
): Chunk[] {
  const chunks: Chunk[] = [];

  for (const doc of documents) {
    // Split on paragraphs or double newlines
    const paragraphs = doc.content
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    let currentTokens: string[] = [];
    let chunkIndex = 0;

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const paraWords = para.split(/\s+/).filter(Boolean);

      if (paraWords.length === 0) continue;

      // If single paragraph is larger than chunkSize, break it into smaller sentences
      if (paraWords.length > chunkSize) {
        const sentences = para.match(/[^.!?]+[.!?]+(\s|$)/g) || [para];
        for (const sent of sentences) {
          const sentWords = sent.trim().split(/\s+/).filter(Boolean);
          if (currentTokens.length + sentWords.length <= chunkSize) {
            currentTokens.push(...sentWords);
          } else {
            if (currentTokens.length > 0) {
              const text = currentTokens.join(' ');
              chunks.push({
                id: `${doc.id}_c${chunkIndex}`,
                docId: doc.id,
                docTitle: doc.title,
                text,
                tokenCount: currentTokens.length,
                chunkIndex,
                metadata: {
                  title: doc.title,
                  category: doc.category,
                  author: doc.author,
                  year: doc.year,
                  source: doc.source,
                  tags: [...doc.tags],
                },
              });
              chunkIndex++;
              // Overlap
              const overlapWords = currentTokens.slice(-Math.min(chunkOverlap, currentTokens.length));
              currentTokens = [...overlapWords, ...sentWords];
            } else {
              currentTokens = sentWords;
            }
          }
        }
        continue;
      }

      if (currentTokens.length + paraWords.length <= chunkSize) {
        currentTokens.push(...paraWords);
      } else {
        if (currentTokens.length > 0) {
          const text = currentTokens.join(' ');
          chunks.push({
            id: `${doc.id}_c${chunkIndex}`,
            docId: doc.id,
            docTitle: doc.title,
            text,
            tokenCount: currentTokens.length,
            chunkIndex,
            metadata: {
              title: doc.title,
              category: doc.category,
              author: doc.author,
              year: doc.year,
              source: doc.source,
              tags: [...doc.tags],
            },
          });
          chunkIndex++;
          const overlapWords = currentTokens.slice(-Math.min(chunkOverlap, currentTokens.length));
          currentTokens = [...overlapWords, ...paraWords];
        } else {
          currentTokens = paraWords;
        }
      }
    }

    if (currentTokens.length > 0) {
      const text = currentTokens.join(' ');
      chunks.push({
        id: `${doc.id}_c${chunkIndex}`,
        docId: doc.id,
        docTitle: doc.title,
        text,
        tokenCount: currentTokens.length,
        chunkIndex,
        metadata: {
          title: doc.title,
          category: doc.category,
          author: doc.author,
          year: doc.year,
          source: doc.source,
          tags: [...doc.tags],
        },
      });
    }
  }

  return chunks;
}
