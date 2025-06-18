import { GoogleGenerativeAI } from '@google/generative-ai'
import { Angle, Persona } from '../types/onesheet'

// Initialize Gemini AI - we'll pass the API key when calling from the API route
export function initializeAI(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp-1219' })
}

// Prompt templates from the cheatsheet
const PROMPTS = {
  // Audience Research
  adAngles: `Analyze the whole website and customer reviews and give me different ad angles to sell this product in a facebook ad in the order that you think would be most relevant to customers:

Website: {website}
Reviews: {reviews}

Please provide:
1. At least 5-7 different ad angles
2. Order them by relevance/potential impact
3. Include a brief explanation for each angle
4. Consider different awareness levels`,

  benefits: `Give me some benefits of people who do use {product} in priority order:

Website: {website}

Please provide:
1. List of key benefits in priority order
2. Supporting evidence for each benefit
3. Customer language/quotes where available
4. Emotional and functional benefits`,

  painPoints: `Give me some pain points of people who don't use {product} in priority order:

Website: {website}

Please provide:
1. List of pain points in priority order
2. Severity/urgency of each pain point
3. How the product solves each pain point
4. Customer language describing these pains`,

  onesheetFillout: `Using the reviews below, give me details on each of the following for my product: {product}

Reviews: {reviews}

Benefits, prior pain points, features, prior objections, failed solutions, and other. Add supporting reviews under each bullet point. List points under each section in priority order according to the reviews.

Format the response with clear sections and include actual review quotes as evidence.`,

  generatePersonas: `{hasReviews ? 
    'Here are reviews for my brand {brand}. Please generate audience personas based on this information including detailed demographics, psychographics and awareness levels of each.' :
    'Here\'s some information about my product: {website}. Please generate audience personas based on this information including detailed demographics, psychographics and awareness levels of each.'}

{hasReviews ? 'Reviews: {reviews}' : ''}

For each persona include:
- Name and title
- Demographics (age, gender, location, income, education, occupation)
- Psychographics (interests, lifestyle, values, pain points)
- Awareness level (unaware, problem aware, solution aware, product aware, most aware)
- Customer language (how they describe their problems/needs)
- Recommended messaging approach`,

  reviewPatterns: `What are some interesting patterns of the reviews that humans could miss?

Reviews: {reviews}

Please analyze for:
1. Hidden patterns and trends
2. Unexpected correlations
3. Sentiment shifts over time
4. Language patterns and frequently used phrases
5. Unspoken needs or desires
6. Demographic patterns`,

  shockingStatistics: `Give me some shocking statistics related to pain points and benefits of {product}, but not directly related to the product itself.

Context: {context}

Please provide:
1. Relevant industry statistics
2. Problem/pain point statistics
3. Market size and growth statistics
4. Behavioral statistics
5. Include sources where possible`,

  // Competitor Research
  competitorGapAnalysis: `Analyze these competitors websites and reviews and identify gaps or opportunities where {product} has a competitive advantage or customers are dissatisfied with the competition:

Competitors: {competitors}
Our Product: {ourProduct}

Please identify:
1. Feature gaps in competitor offerings
2. Customer complaints about competitors
3. Positioning opportunities
4. Unique advantages we can leverage
5. Messaging differentiation strategies`,

  competitorComparison: `Compare the features of {product} with competitors and highlight unique selling points:

Our Product: {ourProduct}
Competitors: {competitors}

Please provide:
1. Feature-by-feature comparison
2. Unique features only we have
3. Features we do better
4. Price/value comparison
5. Quality comparison`,

  // Social Listening
  redditAnalysis: `Analyze this Reddit post and identify key words and phrases people use when talking about {product}. Use real customer language from the post. Identify key language regarding any of the following: Benefits, prior pain points, features, prior objections or previous failed solutions.

Reddit Post: {content}

Extract:
1. Exact phrases and terminology used
2. Emotional language and sentiment
3. Common questions and concerns
4. Solution language
5. Comparison language`,

  articleAnalysis: `Analyze this article and extract key information about {product}. Using exact terminology from the article, look for things like benefits, prior pain points, features, prior objections, previous failed solutions, sentiment, statistics and any other relevant information for audience research.

Article: {content}

Extract and categorize all relevant information with exact quotes.`,

  // Creative Generation
  testimonialHeadlines: `Look through these reviews and find the ones most suitable for a Facebook ad headline. It should not be long, but it should use the customers' language to convey the value propositions of the product.

Reviews: {reviews}

Provide:
1. 10-15 headline options
2. The original review quote
3. Why it works as a headline
4. Which angle/benefit it addresses`,

  oneLiners: `Look through these reviews and give me some 'one-liners' with the key value props and use cases. Use real customer language from the reviews.

Reviews: {reviews}

Find:
1. Concise, powerful statements
2. Emotionally moving phrases
3. Clear value propositions
4. Memorable quotes
5. Social proof statements`,

  midjourneyIdeas: `Here's some information about my brand: {website}

Analyze the website above and give me a list of the key benefits and pain points of our customers. For each benefit/pain point, come up with several visual ideas for images we can generate in Midjourney to showcase the benefit/pain point. 

Prioritize scroll stopping visual ideas as this is for a Facebook image ad for the brand (text overlay will be added in post-production). All ideas should take into account the fact that we will not be able to use the product in the image.

Format each idea with:
1. The benefit/pain point
2. 3-5 visual concepts
3. Midjourney prompt suggestion
4. Why it would stop the scroll`,

  problemSolutionScenarios: `Generate problem-solution scenarios for Facebook ads based on common pain points found in reviews of {product}:

Reviews: {reviews}

For each scenario provide:
1. The problem setup
2. The solution reveal
3. Hook options
4. Visual suggestions
5. Call-to-action ideas`
}

export interface AIGenerationOptions {
  type: keyof typeof PROMPTS
  data: {
    product?: string
    brand?: string
    website?: string
    reviews?: string
    competitors?: string
    ourProduct?: string
    content?: string
    context?: string
    hasReviews?: boolean
  }
}

// Local interfaces for parsing AI responses
interface ParsedOnesheetItem {
  text: string
  evidence: string[]
}

interface ParsedHeadline {
  headline: string
  originalReview: string
  reasoning: string
}

interface ParsedMidjourneyIdea {
  benefitOrPainPoint: string
  visualConcepts: string[]
  midjourneyPrompts: string[]
}

export class OnesheetAIService {
  static async generate(options: AIGenerationOptions, apiKey: string) {
    try {
      const { type, data } = options
      let prompt = PROMPTS[type]

      // Replace placeholders with actual data
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value)
        }
      })

      // Clean up any remaining placeholders
      prompt = prompt.replace(/{[^}]+}/g, '')

      // Initialize the model with the API key
      const model = initializeAI(apiKey)
      
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      return {
        success: true,
        data: this.parseResponse(type, text),
        rawText: text
      }
    } catch (error) {
      console.error('AI generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private static parseResponse(type: keyof typeof PROMPTS, text: string) {
    // Parse the response based on the type of request
    switch (type) {
      case 'adAngles':
        return this.parseAdAngles(text)
      case 'generatePersonas':
        return this.parsePersonas(text)
      case 'onesheetFillout':
        return this.parseOnesheetFillout(text)
      case 'testimonialHeadlines':
        return this.parseHeadlines(text)
      case 'midjourneyIdeas':
        return this.parseMidjourneyIdeas(text)
      default:
        return { text }
    }
  }

  private static parseAdAngles(text: string) {
    const angles: Angle[] = []
    const lines = text.split('\n')
    let currentAngle: Omit<Angle, 'id'> | null = null

    lines.forEach(line => {
      const angleMatch = line.match(/^\d+\.\s+(.+)/)
      if (angleMatch) {
        if (currentAngle) {
          angles.push({
            ...currentAngle,
            id: Date.now().toString() + Math.random(),
            aiGenerated: true,
          })
        }
        currentAngle = {
          title: angleMatch[1].replace(/[*:]/g, '').trim(),
          description: '',
          priority: angles.length + 1,
        }
      } else if (currentAngle && line.trim()) {
        currentAngle.description += line.trim() + ' '
      }
    })

    if (currentAngle) {
      angles.push({
        ...currentAngle,
        id: Date.now().toString() + Math.random(),
        aiGenerated: true,
      })
    }
    return { angles }
  }

  private static parsePersonas(text: string) {
    const personas: Persona[] = []
    const sections = text.split(/(?=(?:Persona|Profile|Segment)\s+\d+:|#{1,3}\s+)/i)

    sections.forEach(section => {
      if (!section.trim()) return

      const persona: Persona = {
        id: Date.now().toString() + Math.random(),
        title: '',
        demographics: {
          age: '',
          gender: '',
          location: '',
          income: '',
          education: '',
          occupation: '',
        },
        psychographics: {
          interests: [],
          lifestyle: [],
          values: [],
          painPoints: [],
        },
        awarenessLevel: 'unaware',
        customerLanguage: [],
      }

      // Extract title
      const titleMatch = section.match(/(?:Persona|Profile|Segment)\s+\d+:\s*(.+?)(?:\n|$)/i)
      if (titleMatch) persona.title = titleMatch[1].trim()

      // Extract demographics
      const ageMatch = section.match(/Age:?\s*(.+?)(?:\n|,|;|$)/i)
      if (ageMatch) persona.demographics.age = ageMatch[1].trim()

      const genderMatch = section.match(/Gender:?\s*(.+?)(?:\n|,|;|$)/i)
      if (genderMatch) persona.demographics.gender = genderMatch[1].trim()

      const locationMatch = section.match(/Location:?\s*(.+?)(?:\n|,|;|$)/i)
      if (locationMatch) persona.demographics.location = locationMatch[1].trim()

      const incomeMatch = section.match(/Income:?\s*(.+?)(?:\n|,|;|$)/i)
      if (incomeMatch) persona.demographics.income = incomeMatch[1].trim()

      // Extract awareness level
      const awarenessMatch = section.match(/Awareness\s+Level:?\s*(.+?)(?:\n|,|;|$)/i)
      if (awarenessMatch) {
        const level = awarenessMatch[1].toLowerCase()
        if (level.includes('unaware')) persona.awarenessLevel = 'unaware'
        else if (level.includes('problem')) persona.awarenessLevel = 'problemAware'
        else if (level.includes('solution')) persona.awarenessLevel = 'solutionAware'
        else if (level.includes('product')) persona.awarenessLevel = 'productAware'
        else if (level.includes('most')) persona.awarenessLevel = 'mostAware'
      }

      if (persona.title) personas.push(persona)
    })

    return { personas }
  }

  private static parseOnesheetFillout(text: string) {
    const result = {
      benefits: [],
      painPoints: [],
      features: [],
      objections: [],
      failedSolutions: [],
      other: []
    }

    const sections = text.split(/(?=(?:Benefits|Pain\s+Points|Features|Objections|Failed\s+Solutions|Other):)/i)

    sections.forEach(section => {
      const benefitsMatch = section.match(/Benefits:([\s\S]+?)(?=(?:Pain\s+Points|Features|Objections|Failed\s+Solutions|Other):|$)/i)
      if (benefitsMatch) {
        result.benefits = this.extractItems(benefitsMatch[1])
      }

      const painPointsMatch = section.match(/Pain\s+Points:([\s\S]+?)(?=(?:Benefits|Features|Objections|Failed\s+Solutions|Other):|$)/i)
      if (painPointsMatch) {
        result.painPoints = this.extractItems(painPointsMatch[1])
      }

      const featuresMatch = section.match(/Features:([\s\S]+?)(?=(?:Benefits|Pain\s+Points|Objections|Failed\s+Solutions|Other):|$)/i)
      if (featuresMatch) {
        result.features = this.extractItems(featuresMatch[1])
      }

      const objectionsMatch = section.match(/Objections:([\s\S]+?)(?=(?:Benefits|Pain\s+Points|Features|Failed\s+Solutions|Other):|$)/i)
      if (objectionsMatch) {
        result.objections = this.extractItems(objectionsMatch[1])
      }

      const failedMatch = section.match(/Failed\s+Solutions:([\s\S]+?)(?=(?:Benefits|Pain\s+Points|Features|Objections|Other):|$)/i)
      if (failedMatch) {
        result.failedSolutions = this.extractItems(failedMatch[1])
      }
    })

    return result
  }

  private static extractItems(text: string): ParsedOnesheetItem[] {
    const items: ParsedOnesheetItem[] = []
    const lines = text.split('\n')
    let currentItem: ParsedOnesheetItem | null = null

    lines.forEach(line => {
      const itemMatch = line.match(/^[-•*]\s+(.+)/)
      if (itemMatch) {
        if (currentItem) items.push(currentItem)
        currentItem = {
          text: itemMatch[1].trim(),
          evidence: [],
        }
      } else if (currentItem && line.includes('"') && line.trim()) {
        currentItem.evidence.push(line.trim())
      }
    })

    if (currentItem) items.push(currentItem)
    return items
  }

  private static parseHeadlines(text: string) {
    const headlines: ParsedHeadline[] = []
    const sections = text.split(/\d+\.\s+/)

    sections.forEach((section, index) => {
      if (!section.trim() || index === 0) return

      const lines = section.split('\n').filter(l => l.trim())
      if (lines.length > 0) {
        headlines.push({
          headline: lines[0].replace(/["*]/g, '').trim(),
          originalReview: lines.find(l => l.includes('Original:') || l.includes('Review:'))?.replace(/Original:|Review:/g, '').trim() || '',
          reasoning: lines.find(l => l.includes('Why:') || l.includes('Reason:'))?.replace(/Why:|Reason:/g, '').trim() || '',
        })
      }
    })

    return { headlines }
  }

  private static parseMidjourneyIdeas(text: string) {
    const ideas: ParsedMidjourneyIdea[] = []
    const sections = text.split(/(?=(?:Benefit|Pain\s+Point)\s+\d+:|#{1,3}\s+)/i)

    sections.forEach(section => {
      if (!section.trim()) return

      const benefitMatch = section.match(/(?:Benefit|Pain\s+Point)\s+\d+:\s*(.+?)(?:\n|$)/i)
      if (benefitMatch) {
        const idea: ParsedMidjourneyIdea = {
          benefitOrPainPoint: benefitMatch[1].trim(),
          visualConcepts: [],
          midjourneyPrompts: [],
        }

        const visualMatches = section.match(/(?:Visual|Concept|Idea)\s+\d+:\s*(.+?)(?:\n|$)/gi)
        if (visualMatches) {
          idea.visualConcepts = visualMatches.map(m => m.replace(/(?:Visual|Concept|Idea)\s+\d+:\s*/i, '').trim())
        }

        const promptMatches = section.match(/(?:Prompt|Midjourney):\s*(.+?)(?:\n|$)/gi)
        if (promptMatches) {
          idea.midjourneyPrompts = promptMatches.map(m => m.replace(/(?:Prompt|Midjourney):\s*/i, '').trim())
        }

        if (idea.benefitOrPainPoint) ideas.push(idea)
      }
    })

    return { ideas }
  }
} 