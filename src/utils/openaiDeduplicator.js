const OpenAI = require('openai');

// 2. Advanced deduplication using GPT for semantic analysis
async function intelligentDuplicationCheck(article1, article2, openai) {
  const prompt = `
Compare these two news articles and determine if they are duplicates or substantially similar:

Article 1:
Title: ${article1.translations?.en?.title || article1.title}
Source: ${article1.source}
Date: ${article1.publishedAt}
Content: ${(article1.translations?.en?.description || article1.content || article1.description || '').substring(0, 500)}

Article 2:
Title: ${article2.translations?.en?.title || article2.title}
Source: ${article2.source}
Date: ${article2.publishedAt}
Content: ${(article2.translations?.en?.description || article2.content || article2.description || '').substring(0, 500)}

Analyze if these articles:
1. Report the same news event
2. Have substantially similar content
3. Are from different sources but cover identical information
4. Are updates of the same story

Respond with JSON only:
{
  "isDuplicate": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation",
  "relationship": "identical/similar_event/update/different"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 200
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error in GPT deduplication check:', error);
    return { isDuplicate: false, confidence: 0, reason: 'Analysis failed' };
  }
}

// 3. Hybrid deduplication strategy
class HybridDeduplicator {
  constructor(options = {}) {
    this.embeddingThreshold = options.embeddingThreshold || 0.90;
    this.gptConfidenceThreshold = options.gptConfidenceThreshold || 0.8;
    this.useGPTForBorderline = options.useGPTForBorderline || true;
    this.openai = new OpenAI({ apiKey: options.apiKey });
  }

  async deduplicateArticles(newArticles, existingArticles = []) {
    const uniqueNewArticles = [];
    const duplicates = [];
    const processingStats = {
      total: newArticles.length,
      unique: 0,
      duplicates: 0,
      errors: 0
    };

    console.log(`Starting deduplication of ${newArticles.length} new articles against ${existingArticles.length} existing articles...`);

    for (let i = 0; i < newArticles.length; i++) {
      const article = newArticles[i];
      console.log(`Processing article ${i + 1}/${newArticles.length}: ${article.title?.substring(0, 50)}...`);

      try {
        // Check against all existing articles AND the new unique ones found so far
        const articlesToCompareAgainst = [...existingArticles, ...uniqueNewArticles];
        const isDupe = await this.checkForDuplicates(article, articlesToCompareAgainst);
        
        if (isDupe.isDuplicate) {
          duplicates.push({
            article: article,
            duplicateInfo: isDupe
          });
          processingStats.duplicates++;
          console.log(`  ❌ Duplicate found: ${isDupe.reason}`);
        } else {
          uniqueNewArticles.push(article);
          processingStats.unique++;
          console.log(`  ✅ Unique article added`);
        }

        // Rate limiting for OpenAI API
        if (i < newArticles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`Error processing article ${i + 1}:`, error);
        processingStats.errors++;
        // If an error occurs, we consider the article unique to avoid data loss
        uniqueNewArticles.push(article);
      }
    }

    console.log('Deduplication complete:', processingStats);
    
    return {
      uniqueArticles: uniqueNewArticles, // Return only the unique NEW articles
      duplicates,
      stats: processingStats
    };
  }

  async checkForDuplicates(newArticle, existingArticles) {
    // Quick checks first
    const quickCheck = this.quickDuplicateCheck(newArticle, existingArticles);
    if (quickCheck.isDuplicate) {
      return quickCheck;
    }

    // Embedding-based similarity
    const embeddingCheck = await this.embeddingSimilarityCheck(newArticle, existingArticles);
    
    if (embeddingCheck.isDuplicate) {
      return embeddingCheck;
    }

    // GPT analysis for borderline cases
    if (this.useGPTForBorderline && embeddingCheck.maxSimilarity > 0.75) {
      const mostSimilar = embeddingCheck.mostSimilarArticle;
      const gptCheck = await intelligentDuplicationCheck(newArticle, mostSimilar, this.openai);
      
      if (gptCheck.isDuplicate && gptCheck.confidence >= this.gptConfidenceThreshold) {
        return {
          isDuplicate: true,
          method: 'gpt_analysis',
          similarity: gptCheck.confidence,
          reason: `GPT analysis: ${gptCheck.reason}`,
          duplicateOf: mostSimilar
        };
      }
    }

    return { isDuplicate: false };
  }

  // Quick checks for obvious duplicates
  quickDuplicateCheck(newArticle, existingArticles) {
    for (const existing of existingArticles) {
      // Exact title match
      if (newArticle.title && existing.title && 
          newArticle.title.trim().toLowerCase() === existing.title.trim().toLowerCase()) {
        return {
          isDuplicate: true,
          method: 'exact_title',
          reason: 'Identical titles',
          duplicateOf: existing
        };
      }

      // Same URL
      if (newArticle.url && existing.url && newArticle.url === existing.url) {
        return {
          isDuplicate: true,
          method: 'same_url',
          reason: 'Identical URLs',
          duplicateOf: existing
        };
      }

      // Very similar titles (Levenshtein distance)
      if (newArticle.title && existing.title) {
        const similarity = this.stringSimilarity(newArticle.title, existing.title);
        if (similarity > 0.95) {
          return {
            isDuplicate: true,
            method: 'similar_title',
            similarity: similarity,
            reason: `Very similar titles (${(similarity * 100).toFixed(1)}%)`,
            duplicateOf: existing
          };
        }
      }
    }

    return { isDuplicate: false };
  }

  async embeddingSimilarityCheck(newArticle, existingArticles) {
    const newText = this.createArticleText(newArticle);
    const newEmbedding = await this.generateEmbedding(newText);
    
    if (!newEmbedding) {
      return { isDuplicate: false };
    }

    let maxSimilarity = 0;
    let mostSimilarArticle = null;

    for (const existing of existingArticles) {
      const existingText = this.createArticleText(existing);
      const existingEmbedding = await this.generateEmbedding(existingText);
      
      if (existingEmbedding) {
        const similarity = this.cosineSimilarity(newEmbedding, existingEmbedding);
        
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          mostSimilarArticle = existing;
        }
        
        if (similarity >= this.embeddingThreshold) {
          return {
            isDuplicate: true,
            method: 'embedding_similarity',
            similarity: similarity,
            reason: `High content similarity (${(similarity * 100).toFixed(2)}%)`,
            duplicateOf: existing
          };
        }
      }
    }

    return { 
      isDuplicate: false, 
      maxSimilarity: maxSimilarity,
      mostSimilarArticle: mostSimilarArticle
    };
  }

  // Helper methods
  createArticleText(article) {
    const title = article.translations?.en?.title || article.title || '';
    const description = article.translations?.en?.description || article.description || '';
    const content = article.content ? article.content.substring(0, 1000) : ''; // Content is not translated

    const parts = [
      title,
      description,
      content
    ].filter(part => part && part.trim().length > 0);
    
    return parts.join(' ').trim();
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text.substring(0, 8000),
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// 4. Usage examples and Next.js API integration
async function deduplicateMalariaNews(newArticles, existingArticles, apiKey) {
  const deduplicator = new HybridDeduplicator({
    embeddingThreshold: 0.90,
    gptConfidenceThreshold: 0.8,
    useGPTForBorderline: true,
    apiKey: apiKey
  });

  return await deduplicator.deduplicateArticles(newArticles, existingArticles);
}

module.exports = { deduplicateMalariaNews };
