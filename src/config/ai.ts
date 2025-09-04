import { config } from "dotenv";

// Load environment variables
config();

// AI Model Configuration
export const aiConfig = {
  // OpenAI (Active)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
  },
  
  // TODO: Uncomment when ready to use Anthropic
  // anthropic: {
  //   apiKey: process.env.ANTHROPIC_API_KEY,
  //   model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
  //   maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1000'),
  // },
  
  // TODO: Uncomment when ready to use Gemini
  // gemini: {
  //   apiKey: process.env.GOOGLE_AI_API_KEY,
  //   model: process.env.GEMINI_MODEL || 'gemini-pro',
  //   maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '1000'),
  // },

  // General AI settings
  defaultTemperature: parseFloat(process.env.AI_DEFAULT_TEMPERATURE || '0.7'),
  enableStreaming: process.env.AI_ENABLE_STREAMING !== 'false',
  contextWindow: parseInt(process.env.AI_CONTEXT_WINDOW || '20'),
  
  // Chat settings
  maxConversationsPerMember: parseInt(process.env.CHAT_MAX_CONVERSATIONS_PER_MEMBER || '5'),
  messageRetentionDays: parseInt(process.env.CHAT_MESSAGE_RETENTION_DAYS || '90'),
  autoEscalationThreshold: parseInt(process.env.CHAT_AUTO_ESCALATION_THRESHOLD || '3'),
};

// Validate AI configuration
export function validateAIConfig() {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!aiConfig.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required');
  }
  
  // TODO: Add validation for other providers when enabled
  // if (!aiConfig.anthropic.apiKey) {
  //   warnings.push('ANTHROPIC_API_KEY not configured - Anthropic models will fall back to OpenAI');
  // }
  
  // if (!aiConfig.gemini.apiKey) {
  //   warnings.push('GOOGLE_AI_API_KEY not configured - Gemini models will fall back to OpenAI');
  // }
  
  if (warnings.length > 0) {
    console.warn('⚠️  AI Configuration warnings:', warnings);
  }
  
  if (errors.length > 0) {
    console.error('❌ AI Configuration errors:', errors);
    throw new Error(`AI Configuration errors: ${errors.join(', ')}`);
  }
  
  console.log('✅ AI Configuration validated successfully');
  return true;
}

// Test AI configuration
export function testAIConfig() {
  console.log('🧪 Testing AI Configuration...');
  
  const config = {
    openai: {
      configured: !!aiConfig.openai.apiKey,
      model: aiConfig.openai.model,
    },
    // TODO: Add other providers when enabled
    // anthropic: {
    //   configured: !!aiConfig.anthropic.apiKey,
    //   model: aiConfig.anthropic.model,
    // },
    // gemini: {
    //   configured: !!aiConfig.gemini.apiKey,
    //   model: aiConfig.gemini.model,
    // },
    settings: {
      defaultTemperature: aiConfig.defaultTemperature,
      enableStreaming: aiConfig.enableStreaming,
      contextWindow: aiConfig.contextWindow,
    },
    chat: {
      maxConversationsPerMember: aiConfig.maxConversationsPerMember,
      messageRetentionDays: aiConfig.messageRetentionDays,
      autoEscalationThreshold: aiConfig.autoEscalationThreshold,
    }
  };
  
  console.log('📋 AI Configuration:', JSON.stringify(config, null, 2));
  return config;
}
