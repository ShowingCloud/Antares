/**
 * Prompt engineering for SEO-optimized hosting reviews
 */

import { ReviewGenerationOptions } from './types';

export class PromptBuilder {
  /**
   * Build the system prompt for GPT-4
   */
  static buildSystemPrompt(): string {
    return `You are an expert SEO content writer specializing in web hosting reviews. Your task is to create comprehensive, SEO-optimized hosting service reviews that are:
- Well-researched and factual
- SEO-friendly with natural keyword integration
- Structured with clear pros and cons
- Engaging and informative for readers
- Optimized for search engine visibility

You must respond ONLY with valid JSON in the exact format specified. Do not include any markdown formatting, code blocks, or explanatory text outside the JSON.`;
  }

  /**
   * Build the user prompt with service details
   */
  static buildUserPrompt(options: ReviewGenerationOptions): string {
    const {
      serviceName,
      serviceDescription,
      features,
      pricing,
      targetKeywords,
      tone,
      length,
      includeComparison,
      competitorNames,
      customInstructions,
    } = options;

    let prompt = `Generate a comprehensive, SEO-optimized review for the web hosting service: ${serviceName}\n\n`;

    // Service information
    if (serviceDescription) {
      prompt += `Service Description: ${serviceDescription}\n\n`;
    }

    if (features && features.length > 0) {
      prompt += `Key Features:\n${features.map((f) => `- ${f}`).join('\n')}\n\n`;
    }

    if (pricing) {
      prompt += `Pricing Information: ${pricing}\n\n`;
    }

    // SEO requirements
    if (targetKeywords && targetKeywords.length > 0) {
      prompt += `Target Keywords (integrate naturally): ${targetKeywords.join(', ')}\n\n`;
    }

    // Content specifications
    const lengthGuidance = {
      short: '500-800 words',
      medium: '1000-1500 words',
      long: '2000-3000 words',
    };
    const wordCount = lengthGuidance[length || 'medium'];

    prompt += `Content Requirements:\n`;
    prompt += `- Word count: ${wordCount}\n`;
    prompt += `- Tone: ${tone || 'professional'}\n`;
    prompt += `- Include natural keyword integration for SEO\n`;
    prompt += `- Use semantic keywords and related terms\n`;
    prompt += `- Include LSI (Latent Semantic Indexing) keywords\n\n`;

    // Comparison section
    if (includeComparison && competitorNames && competitorNames.length > 0) {
      prompt += `Include a comparison section with: ${competitorNames.join(', ')}\n\n`;
    }

    // Custom instructions
    if (customInstructions) {
      prompt += `Additional Instructions: ${customInstructions}\n\n`;
    }

    // JSON structure requirement
    prompt += `\nReturn ONLY valid JSON in this exact structure (no markdown, no code blocks, no explanations):
{
  "title": "SEO-optimized review title (60-70 characters, include primary keyword)",
  "content": "Comprehensive review content (${wordCount}, well-structured with headings, natural keyword integration, semantic keywords, and LSI terms)",
  "pros": ["Pro 1 (detailed)", "Pro 2 (detailed)", "Pro 3 (detailed)", "at least 3-5 pros"],
  "cons": ["Con 1 (honest and balanced)", "Con 2 (if applicable)", "at least 1-3 cons"],
  "rating": 4.5,
  "metadata": {
    "serviceName": "${serviceName}",
    "keywords": ["primary keyword", "secondary keyword", "LSI keyword 1", "LSI keyword 2", "semantic keyword 1"],
    "seoTitle": "SEO-optimized title tag (50-60 characters)",
    "metaDescription": "Compelling meta description (150-160 characters, includes primary keyword)",
    "focusKeyword": "${targetKeywords?.[0] || serviceName.toLowerCase()}",
    "wordCount": 0,
    "readabilityScore": 0,
    "generatedAt": "${new Date().toISOString()}",
    "model": "gpt-4"
  }
}

Important:
- The title should be compelling and include the primary keyword naturally
- Content should be well-structured with natural keyword placement (not keyword stuffing)
- Use semantic variations and related terms throughout
- Pros and cons should be specific and detailed
- Rating should be realistic (between 3.5 and 5.0 for quality services)
- Keywords array should include primary, secondary, LSI, and semantic keywords
- SEO title and meta description should be optimized for search engines
- Word count should match the specified range
- Ensure all JSON is valid and properly formatted`;

    return prompt;
  }

  /**
   * Build prompt for generating multiple reviews
   */
  static buildBatchPrompt(services: ReviewGenerationOptions[]): string {
    return `Generate SEO-optimized reviews for the following hosting services. Return a JSON array with reviews in the same format as specified.

Services to review:
${services.map((s, i) => `${i + 1}. ${s.serviceName}${s.serviceDescription ? ` - ${s.serviceDescription}` : ''}`).join('\n')}

Each review should follow the same structure and SEO requirements as specified in the single review format.`;
  }

  /**
   * Extract SEO keywords from content
   */
  static extractKeywords(content: string, serviceName: string): string[] {
    const keywords: string[] = [serviceName.toLowerCase()];
    
    // Common hosting-related keywords
    const hostingTerms = [
      'web hosting',
      'hosting service',
      'shared hosting',
      'vps hosting',
      'dedicated server',
      'cloud hosting',
      'wordpress hosting',
      'hosting provider',
      'hosting company',
      'best hosting',
      'affordable hosting',
      'reliable hosting',
      'fast hosting',
      'secure hosting',
    ];

    // Add relevant terms found in content
    hostingTerms.forEach((term) => {
      if (content.toLowerCase().includes(term)) {
        keywords.push(term);
      }
    });

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Calculate readability score (simplified Flesch Reading Ease approximation)
   */
  static calculateReadabilityScore(content: string): number {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const syllables = words.reduce((count, word) => {
      return count + this.countSyllables(word);
    }, 0);

    if (sentences.length === 0 || words.length === 0) {
      return 50; // Default score
    }

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Simplified Flesch Reading Ease formula
    const score =
      206.835 -
      1.015 * avgSentenceLength -
      84.6 * avgSyllablesPerWord;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (approximation)
   */
  private static countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }
}

