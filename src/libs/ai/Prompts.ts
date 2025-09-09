import type { MemberLocation, SupportAssistant } from "@/types";
import { PromptTemplate } from "@langchain/core/prompts";


const SYSTEM_PROMPT = `
You are a helpful customer support assistant named {assistantName} for {locationName}. 
You have access to member information tools to help with subscriptions,
billing, and bookable sessions. You can also create support tickets and escalate to human agents when needed.

Business Info:
<businessInfo>
{businessInfo}
</businessInfo>

Member Profile:
<memberProfile>
{memberProfile}
</memberProfile>

Response Instructions:
<responseInstructions>
{responseInstructions}
</responseInstructions>


IMPORTANT:
1. Keep your responses concise and to the point.
2. If you're unsure about something, it's okay to say you don't have that information.
3. Avoid using repetitive questions to complete the objective. 
4. Be respectful and professional at all times.
5. Use the tools provided to you to help the member when needed.
`;


function MemberSummary(ml: MemberLocation) {
    const { member } = ml;
    if (!member) {
        return 'Unknown';
    }
    return `
    Name: ${member.firstName + ' ' + member.lastName}
    Email: ${member.email}
    Member since: ${member.created.toLocaleDateString()}
    `;
}

function BusinessSummary(ml: MemberLocation) {
    const { location } = ml;
    if (!location) {
        return 'Unknown';
    }
    return `
    Name: ${location.name}
    Email: ${location.email}
    Phone: ${location.phone}
    Address: ${location.address}
    City: ${location.city}
    State: ${location.state}
    Postal Code: ${location.postalCode}
    Country: ${location.country}
    About: ${location.about}
    `;
}


type SystemPromptContext = {
    ml: MemberLocation;
    assistant: SupportAssistant;
}

async function formattedPrompt(context: SystemPromptContext) {
    const { ml, assistant } = context;
    return await PromptTemplate.fromTemplate(SYSTEM_PROMPT).format({
        assistantName: assistant.name,
        locationName: ml.location ? ml.location.name : 'Unknown',
        businessInfo: BusinessSummary(ml),
        memberProfile: MemberSummary(ml),
        responseInstructions: assistant.persona.responseStyle || 'professional',
    });
}




function promptInterpolate(template: string, variables: Record<string, any>): string {
    if (!template) return '';

    // Clean up HTML and normalize newlines
    let output = template
        .replace(/<p>/g, '\n')
        .replace(/<\/p>/g, '')
        .replace(/\r\n/g, '\n');

    // Replace variable spans (e.g., <span data-value="user.firstName">@user.firstName</span>)
    output = output.replace(
        /<span[^>]*data-value="([^"]*)"[^>]*>@[^<]*<\/span>/g,
        (_, path) => {
            try {
                const value = path.split('.')
                    .reduce((obj: Record<string, any> | undefined, key: string) =>
                        obj && typeof obj === 'object' ? obj[key] : undefined,
                        variables
                    );
                return value !== undefined ? String(value) : `@${path}`;
            } catch {
                return `@${path}`;
            }
        }
    );

    // Replace @variable.property mentions
    output = output.replace(
        /@([a-zA-Z0-9]+)\.([a-zA-Z0-9]+)/g,
        (match, obj, prop) => {
            return variables[obj]?.[prop] !== undefined
                ? String(variables[obj][prop])
                : match;
        }
    );

    // Clean up whitespace
    return output.trim().replace(/\n\s*\n\s*\n/g, '\n\n');
}
export { formattedPrompt, promptInterpolate };