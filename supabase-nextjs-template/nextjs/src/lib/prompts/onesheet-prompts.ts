// OneSheet AI Prompt Templates
// Based on the Creative Strategy process from the video transcript

export interface PromptTemplate {
  id: string;
  name: string;
  category: 'audience' | 'social' | 'competitor' | 'creative';
  description: string;
  prompt: string;
  inputFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'url' | 'textarea';
    placeholder: string;
    required: boolean;
  }>;
  outputTarget: string; // Where the results should be populated in OneSheet
}

export const ONESHEET_PROMPTS: PromptTemplate[] = [
  // AUDIENCE RESEARCH PROMPTS
  {
    id: 'ad_angles',
    name: 'Generate Ad Angles',
    category: 'audience',
    description: 'Analyze website and reviews to generate different marketing angles',
    prompt: 'Analyze the whole website and customer reviews and give me different ad angles to sell this product in a facebook ad in the order that you think would be most relevant to customers: {{urls}}',
    inputFields: [
      {
        key: 'urls',
        label: 'Website and Review URLs',
        type: 'textarea',
        placeholder: 'Enter website URL and review URLs (one per line)',
        required: true
      }
    ],
    outputTarget: 'angles'
  },
  {
    id: 'generate_benefits',
    name: 'Generate Benefits',
    category: 'audience',
    description: 'Identify key benefits customers experience',
    prompt: 'Give me some benefits of people who do use {{product}} in priority order: {{url}}',
    inputFields: [
      {
        key: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'url',
        label: 'Website URL',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      }
    ],
    outputTarget: 'audience_insights.benefits'
  },
  {
    id: 'generate_pain_points',
    name: 'Generate Pain Points',
    category: 'audience',
    description: 'Identify pain points of non-users',
    prompt: 'Give me some pain points of people who don\'t use {{product}} in priority order: {{url}}',
    inputFields: [
      {
        key: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'url',
        label: 'Website URL',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      }
    ],
    outputTarget: 'audience_insights.painPoints'
  },
  {
    id: 'fill_onesheet',
    name: 'Complete Audience Analysis',
    category: 'audience',
    description: 'Comprehensive analysis using customer reviews',
    prompt: 'Using the reviews below, give me details on each of the following for my product: {{url}}\n\nBenefits, prior pain points, features, prior objections, failed solutions, and other. Add supporting reviews under each bullet point. List points under each section in priority order according to the reviews.\n\nReviews:\n{{reviews}}',
    inputFields: [
      {
        key: 'url',
        label: 'Product URL',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      },
      {
        key: 'reviews',
        label: 'Customer Reviews',
        type: 'textarea',
        placeholder: 'Paste customer reviews here...',
        required: true
      }
    ],
    outputTarget: 'audience_insights.all'
  },
  {
    id: 'generate_personas_no_reviews',
    name: 'Generate Personas (No Reviews)',
    category: 'audience',
    description: 'Create audience personas from product information',
    prompt: 'Here\'s some information about my product: {{url}}. Please generate audience personas based on this information including detailed demographics, psychographics and awareness levels of each.',
    inputFields: [
      {
        key: 'url',
        label: 'Product URL',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      }
    ],
    outputTarget: 'personas'
  },
  {
    id: 'generate_personas_with_reviews',
    name: 'Generate Personas (With Reviews)',
    category: 'audience',
    description: 'Create audience personas from customer reviews',
    prompt: 'Here are reviews for my brand {{brand}}. Please generate audience personas based on this information including detailed demographics, psychographics and awareness levels of each.\n\nReviews:\n{{reviews}}',
    inputFields: [
      {
        key: 'brand',
        label: 'Brand Name',
        type: 'text',
        placeholder: 'Enter your brand name',
        required: true
      },
      {
        key: 'reviews',
        label: 'Customer Reviews',
        type: 'textarea',
        placeholder: 'Paste customer reviews here...',
        required: true
      }
    ],
    outputTarget: 'personas'
  },
  {
    id: 'shocking_statistics',
    name: 'Find Shocking Statistics',
    category: 'audience',
    description: 'Get compelling statistics for hooks and headlines',
    prompt: 'Give me some shocking statistics related to pain points and benefits of my product, but not related to my product directly.\n\nProduct: {{product}}\nPain Points: {{painPoints}}\nBenefits: {{benefits}}',
    inputFields: [
      {
        key: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'painPoints',
        label: 'Key Pain Points',
        type: 'textarea',
        placeholder: 'List the main pain points your product solves...',
        required: true
      },
      {
        key: 'benefits',
        label: 'Key Benefits',
        type: 'textarea',
        placeholder: 'List the main benefits your product provides...',
        required: true
      }
    ],
    outputTarget: 'audience_insights.statistics'
  },
  {
    id: 'objection_handling',
    name: 'Objection Handling',
    category: 'audience',
    description: 'Identify common objections and counterarguments',
    prompt: 'List common objections potential customers have before buying {{product}} and provide counterarguments: {{url}}',
    inputFields: [
      {
        key: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'url',
        label: 'Product URL',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      }
    ],
    outputTarget: 'audience_insights.objections'
  },

  // SOCIAL LISTENING PROMPTS
  {
    id: 'analyze_reddit_quora',
    name: 'Analyze Reddit/Quora Posts',
    category: 'social',
    description: 'Extract customer language from forum discussions',
    prompt: 'Analyze this {{platform}} post and identify key words and phrases people use when talking about {{product}}. Use real customer language from the post. Identify key language regarding any of the following: Benefits, prior pain points, features, prior objections or previous failed solutions.\n\nThis is the full content of the {{platform}} post:\n\n{{content}}',
    inputFields: [
      {
        key: 'platform',
        label: 'Platform',
        type: 'text',
        placeholder: 'Reddit, Quora, etc.',
        required: true
      },
      {
        key: 'product',
        label: 'Product/Topic',
        type: 'text',
        placeholder: 'Enter your product or topic',
        required: true
      },
      {
        key: 'content',
        label: 'Post Content',
        type: 'textarea',
        placeholder: 'Paste the full forum post content here...',
        required: true
      }
    ],
    outputTarget: 'social_listening_data'
  },
  {
    id: 'analyze_articles',
    name: 'Analyze Articles',
    category: 'social',
    description: 'Extract insights from relevant articles',
    prompt: 'Analyze this article and extract key information about {{product}}. Using exact terminology from the article, look for things like benefits, prior pain points, features, prior objections, previous failed solutions, sentiment, statistics and any other relevant information for audience research.\n\nArticle URL: {{url}}',
    inputFields: [
      {
        key: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'url',
        label: 'Article URL',
        type: 'url',
        placeholder: 'https://article-url.com',
        required: true
      }
    ],
    outputTarget: 'social_listening_data'
  },

  // COMPETITOR RESEARCH PROMPTS
  {
    id: 'competitor_research_table',
    name: 'Competitor Analysis',
    category: 'competitor',
    description: 'Analyze competitor messaging and positioning',
    prompt: 'Look at the following competitors\' reviews: {{competitorUrls}}\n\nAnalyze the similarities and differences in messaging between theirs and our products.\n\nOur product: {{ourProduct}} - {{ourUrl}}',
    inputFields: [
      {
        key: 'ourProduct',
        label: 'Our Product',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'ourUrl',
        label: 'Our Website',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      },
      {
        key: 'competitorUrls',
        label: 'Competitor URLs',
        type: 'textarea',
        placeholder: 'Enter competitor URLs (one per line)',
        required: true
      }
    ],
    outputTarget: 'competitor_analysis'
  },
  {
    id: 'competitor_gap_analysis',
    name: 'Competitor Gap Analysis',
    category: 'competitor',
    description: 'Find competitive advantages and opportunities',
    prompt: 'Analyze these competitors websites and reviews and identify gaps or opportunities where {{product}} has a competitive advantage or customers are dissatisfied with the competition: {{competitorUrls}}',
    inputFields: [
      {
        key: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'competitorUrls',
        label: 'Competitor URLs',
        type: 'textarea',
        placeholder: 'Enter competitor URLs (one per line)',
        required: true
      }
    ],
    outputTarget: 'competitor_analysis.opportunities'
  },

  // CREATIVE BRAINSTORM PROMPTS
  {
    id: 'testimonial_headlines',
    name: 'Generate Testimonial Headlines',
    category: 'creative',
    description: 'Create Facebook ad headlines from customer reviews',
    prompt: 'Look through these reviews and find the ones most suitable for a Facebook ad headline. It should not be long, but it should use the customers\' language to convey the value propositions of the product. For example, {{example}}\n\nReviews:\n{{reviews}}',
    inputFields: [
      {
        key: 'example',
        label: 'Example Headline',
        type: 'text',
        placeholder: 'e.g., "This literally changed my morning routine"',
        required: false
      },
      {
        key: 'reviews',
        label: 'Customer Reviews',
        type: 'textarea',
        placeholder: 'Paste customer reviews here...',
        required: true
      }
    ],
    outputTarget: 'hooks'
  },
  {
    id: 'generate_one_liners',
    name: 'Generate One-Liners',
    category: 'creative',
    description: 'Extract powerful one-liners from customer reviews',
    prompt: 'Look through these reviews and give me some \'one-liners\' with the key value props and use cases. Use real customer language from the reviews.\n\nReviews:\n{{reviews}}',
    inputFields: [
      {
        key: 'reviews',
        label: 'Customer Reviews',
        type: 'textarea',
        placeholder: 'Paste customer reviews here...',
        required: true
      }
    ],
    outputTarget: 'hooks'
  },
  {
    id: 'midjourney_ideas',
    name: 'Generate Visual Ideas',
    category: 'creative',
    description: 'Create Midjourney prompts for visual ads',
    prompt: 'Here\'s some information about my brand: {{url}}\n\nAnalyze the website above and give me a list of the key benefits and pain points of our customers. For each benefit/pain point, come up with several visual ideas for images we can generate in Midjourney to showcase the benefit/pain point. Preferably, prioritize scroll stopping visual ideas as this is for a Facebook image ad for the brand (text overlay will be added in post-production). Feel free to also add on any ideas for Midjourney images about the brand in general based on your research. All ideas should take into account the fact that we will not be able to use the product in the image.',
    inputFields: [
      {
        key: 'url',
        label: 'Brand Website',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      }
    ],
    outputTarget: 'visuals'
  },
  {
    id: 'metaphor_visuals',
    name: 'Generate Metaphor Visuals',
    category: 'creative',
    description: 'Find similes/metaphors for visual concepts',
    prompt: 'Look through these reviews for my brand and put together a list of all reviews that use similes or metaphors. We are looking to create a Midjourney image with exaggerated similes/metaphors to create Facebook ads for the brand.\n\nReviews:\n{{reviews}}',
    inputFields: [
      {
        key: 'reviews',
        label: 'Customer Reviews',
        type: 'textarea',
        placeholder: 'Paste customer reviews here...',
        required: true
      }
    ],
    outputTarget: 'visuals'
  },
  {
    id: 'problem_solution_scenarios',
    name: 'Problem-Solution Scenarios',
    category: 'creative',
    description: 'Generate problem-solution ad concepts',
    prompt: 'Generate problem-solution scenarios for Facebook ads based on common pain points found in reviews of {{product}}: {{url}}\n\nCustomer Reviews:\n{{reviews}}',
    inputFields: [
      {
        key: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'url',
        label: 'Product URL',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      },
      {
        key: 'reviews',
        label: 'Customer Reviews',
        type: 'textarea',
        placeholder: 'Paste customer reviews here...',
        required: true
      }
    ],
    outputTarget: 'concepts'
  },
  {
    id: 'emotional_hooks',
    name: 'Generate Emotional Hooks',
    category: 'creative',
    description: 'Create emotional hooks from testimonials',
    prompt: 'Create emotional hooks for Facebook ads using customer testimonials and reviews of {{product}}: {{url}}\n\nCustomer Reviews:\n{{reviews}}',
    inputFields: [
      {
        key: 'product',
        label: 'Product Name',
        type: 'text',
        placeholder: 'Enter your product name',
        required: true
      },
      {
        key: 'url',
        label: 'Product URL',
        type: 'url',
        placeholder: 'https://yourwebsite.com',
        required: true
      },
      {
        key: 'reviews',
        label: 'Customer Reviews',
        type: 'textarea',
        placeholder: 'Paste customer reviews here...',
        required: true
      }
    ],
    outputTarget: 'hooks'
  }
];

// Helper functions to get prompts by category
export const getPromptsByCategory = (category: string): PromptTemplate[] => {
  return ONESHEET_PROMPTS.filter(prompt => prompt.category === category);
};

export const getPromptById = (id: string): PromptTemplate | undefined => {
  return ONESHEET_PROMPTS.find(prompt => prompt.id === id);
};

// Template replacement function
export const replacePlaceholders = (template: string, values: Record<string, string>): string => {
  let result = template;
  Object.entries(values).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  return result;
}; 