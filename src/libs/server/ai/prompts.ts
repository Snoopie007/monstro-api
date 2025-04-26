import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { AIBot, AINodeOptions, RetrievalNodeOptions, VariableSchema } from "@/types";
import { interpolate } from "@/libs/utils";
import { calculateAICost } from "./utils";

function getZodType(type: "string" | "number" | "boolean", instruction: string) {
    const typeMapping = {
        string: z.string(),
        number: z.number(),
        boolean: z.boolean(),
    };
    return typeMapping[type].describe(instruction);
}

// Function to create a dynamic Zod schema
function createDynamicZodSchema(variables: VariableSchema[]) {
    const schemaEntries = variables.map(({ key, description, returnType }) => [
        key,
        getZodType(returnType, description),
    ]);
    return z.object(Object.fromEntries(schemaEntries));
}
const AnalysisPrompt = `
You are an expert conversation analyst evaluating customer interactions for local businesses.
Analyze the provided conversation history focusing on two critical aspects:

1. Customer Satisfaction Level 
2. Whether the specific objective has been completed

THE CURRENT OBJECTIVE IS:
{current_objective}


ANALYSIS INSTRUCTIONS:
- Review the entire conversation history thoroughly
- Assess customer's tone, language patterns, anger level, and emotional state
- Determine if the specific conversation objective has been achieved
- If prospect reply is STOP or Dont Message Me, then the rating is 1

ANGER RATING SCALE (1-99):
- 1-40: Not acceptable - Customer is clearly upset, using harsh language, expressing strong dissatisfaction, or showing hostility
- 41-70: Moderate - Customer shows signs of frustration or annoyance but is still engaged in the conversation
- 71-99: Good - Customer is calm and composed with no significant signs of frustration

KEY INDICATORS TO EVALUATE:
- Tone: Aggressive language, capitalization, excessive punctuation
- Response patterns: Short, abrupt responses or long, ranting messages
- Explicit statements: Direct expressions of anger or desire to end conversation
- Emotional signals: Expressions of frustration, impatience, or hostility
- Conversation flow: Cooperative vs. combative interaction

OBJECTIVE COMPLETION:
- true = Clear evidence the objective has been fully achieved
- false = Objective remains incomplete

INSTRUCTIONS FOR EVALUATION OF OBJECTIVE COMPLETION:
{instructions}

Your analysis must include specific conversation excerpts that support your conclusions. 

RESPONSE FORMAT:
<analysis>
1. rating (1-99, where 1-40 = not acceptable, 41-70 = moderate, 71-99 = good): [Your Rating]
2. ratingExplained: [Concise explanation of your anger rating]
3. completed: [true/false]
4. reasoning: [Provide specific examples from the conversation that support your conclusions.]
</analysis>

Important Notes:
- Base your analysis solely on the conversation history.
- Do not introduce outside information or make assumptions beyond the provided context.
- Keep your response concise and to the point.
`

const analysis = z.object({
    rating: z.number().describe("Customer anger rating (1-99, where 1-40 = not acceptable, 41-70 = moderate, 71-99 = good)"),
    ratingExplain: z.string().describe("Concise explanation of your anger rating"),
    completed: z.boolean().describe("Whether the conversation objective has been completed (true/false)"),
    reasoning: z.string().describe("Brief evidence-based reasoning for objective completion status"),
});

type AnalysisOutput = {
    cost: number;
    raw: BaseMessage;
    parsed: {
        rating: number;
        ratingExplain: string;
        completed: boolean;
        reasoning: string;
    };
}

type AnalysisInput = {
    msgs: string[],
    goal: string,
    instructions: string | undefined
}

async function analyzeConversation({ msgs, goal, instructions }: AnalysisInput): Promise<AnalysisOutput> {

    const model = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0
    })


    // Create a structured output model for analysis
    const structuredModel = model.withStructuredOutput(analysis, {
        includeRaw: true,
        name: "analysis"
    });

    // Format the analysis prompt with the conversation history and goal
    const formattedPrompt = await PromptTemplate.fromTemplate(AnalysisPrompt).format({
        current_objective: goal,
        instructions: instructions || ""
    });

    // Create a chat prompt template with system and user messages
    const chatPrompt = ChatPromptTemplate.fromMessages([
        ['system', formattedPrompt],
        ['user', '{input}']
    ]);

    // Create the chain by piping the prompt to the structured model
    const chain = chatPrompt.pipe(structuredModel);

    // Invoke the chain with the conversation history
    const result = await chain.invoke({
        input: `CONVERSATION HISTORY:\n\n${msgs.join('\n')}`
    });

    const cost = calculateAICost(result.raw.response_metadata.tokenUsage, "gpt-4o-mini");


    return { ...result, cost };
}

const ExtractionPrompt = `You are a conversation analyst specializing. 
Your goal is to carefully analyze and extract key responses or relevant information from the provided conversation history. 
Remember to base your analysis solely on the information provided in the conversation history. 
If you do not know the value of an attribute asked to extract, return null for the attribute's value.`;

type ExtractionOutput = {
    raw: BaseMessage,
    parsed: Record<string, string | number | boolean>,
    cost: number
}

async function extractVariables(variables: VariableSchema[], msgs: string[]): Promise<ExtractionOutput> {
    const model = new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0
    });

    const schema = createDynamicZodSchema(variables);
    const structuredModel = model.withStructuredOutput(schema, {
        includeRaw: true,
        name: "extraction"
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ['system', ExtractionPrompt],
        ['human', '{input}']
    ]);



    const chain = prompt.pipe(structuredModel);
    const result = await chain.invoke({
        input: `Conversation history delimited with {{{ }}}.\n\n{{{${msgs.join('\n')}}}}`
    });
    const cost = calculateAICost(result.raw.response_metadata.tokenUsage, "gpt-3.5-turbo");
    return { ...result, cost };
}

const ResponsePromptTemplate = `
{overview}

CURRENT OBJECTIVE:
<objective>
{objective}
</objective>

BUSINESS INFORMATION:
<business_info>
{business_info}
</business_info>

RESPONSE INSTRUCTIONS:
<response_instructions>
{response_instructions}
</response_instructions>

ADDITIONAL DATA:
<retrieval_data>
{retrieval_data}
</retrieval_data>

ADDITIONAL INSTRUCTIONS:
<instructions>
{instructions}
</instructions>


IMPORTANT:
1. Keep your responses concise and to the point.
2. Always ask a question to get an answer for the current objective.
3. If you're unsure about something, it's okay to say you don't have that information.
4. Remember to keep your responses within 250 characters or less. 
5. Avoid using repetitive questions to complete the objective. Instead, focus on guiding the conversation naturally towards the goal while providing value to the prospect.
`;

async function ResponsePrompt(
    context: Record<string, any>,
    options: AINodeOptions | RetrievalNodeOptions,
    retrievalData: string,
    bot: AIBot,
    businessInfo: string | null
): Promise<string> {


    return await PromptTemplate.fromTemplate(ResponsePromptTemplate).format({
        retrieval_data: retrievalData,
        overview: interpolate(bot.reason, context),
        objective: interpolate(options.goal, context),
        instructions: interpolate(options.instructions || "", context),
        response_instructions: interpolate(bot.responseDetails, context),
        business_info: businessInfo || "",
    });
}

// const BookingPromptTemplate = `
// {overview}

// Your current objective is:
// <objective>
// {objective}
// </objective>

// Available schedules:
// <schedules>
// {schedules}
// </schedules>

// Here are some additional instructions:
// <additional_instructions>
// {additional_instructions}
// </additional_instructions>

// IMPORTANT:
// 1. Book an appointment using available slots.
// 2. Do NOT offer appointments beyond the available schedules.
// 3. Use human readable date and time for the appointment slots for example tomorrow at 10:00 AM or Thursday at 11:00 AM.
// 4. Remember to keep your responses within 250 characters or less. 
// 5. Avoid using repetitive questions to complete the objective. Instead, focus on guiding the conversation naturally towards the goal while providing value to the prospect.
// `;



export {
    analyzeConversation,
    extractVariables,
    ResponsePrompt,
}

