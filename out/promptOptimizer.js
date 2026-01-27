"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptOptimizer = void 0;
const vscode = __importStar(require("vscode"));
class PromptOptimizer {
    constructor() {
        this.model = '';
        this.apiUrl = 'http://localhost:11434/api/generate';
        this.updateModel();
    }
    /**
     * Updates the model from configuration
     */
    updateModel() {
        const config = vscode.workspace.getConfiguration('cursorTokenOptimizer');
        this.model = (config.get('model') || 'llama3.2').trim();
    }
    /**
     * Main optimization function using a single meta-prompt approach
     */
    async optimize(prompt) {
        // Update model in case it changed in settings
        this.updateModel();
        return await this.optimizePrompt(prompt);
    }
    /**
     * Optimizes a prompt using a meta-prompt approach with Ollama
     */
    async optimizePrompt(userPrompt) {
        // The Meta-Prompt: Instructions for the Model
        const systemInstruction = `You are an expert Prompt Engineer. Rewrite the user's prompt into a structured format.

YOUR OUTPUT MUST START DIRECTLY WITH [CONTEXT] - NO PREFIXES, NO LABELS, NO EXPLANATIONS.

OUTPUT FORMAT (copy this structure exactly):

[CONTEXT]
<brief background information>

[TASK]
<detailed step-by-step description. Break down complex tasks into clear, actionable steps. Be specific about requirements, expected behavior, and implementation approach.>

[CONSTRAINTS]
<any limitations, requirements, or restrictions. If none, write "None.">

[SYSTEM]
You are an expert software developer. Write clean, maintainable code. Avoid spaghetti code. Break down complex tasks into steps and implement them one by one. Do not make too many changes at once. Focus on one feature or fix at a time.

CRITICAL RULES:
1. Translate non-English prompts to English.
2. Remove all fluff, politeness, and unnecessary words.
3. START your output directly with [CONTEXT] - do NOT write "Here is", "Optimized prompt:", "Structured prompt:", or any other labels.
4. Use EXACTLY "[SYSTEM]" as the section header (all uppercase, brackets included) - never use [YOU ARE AN EXPERT SOFTWARE DEVELOPER] or any other variations.
5. The [SYSTEM] section content must be: "You are an expert software developer. Write clean, maintainable code. Avoid spaghetti code. Break down complex tasks into steps and implement them one by one. Do not make too many changes at once. Focus on one feature or fix at a time."
6. Each section header appears exactly once - no duplicates.
7. Output ONLY the 4 sections above - nothing before, nothing after, no explanations, no labels.`;
        try {
            // Try the model name as-is first (trimmed to remove any whitespace)
            let modelToUse = this.model.trim();
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: modelToUse,
                    prompt: `${systemInstruction}\n\nUser prompt to optimize:\n"${userPrompt}"\n\nOutput the structured prompt starting directly with [CONTEXT]. Include all 4 sections: [CONTEXT], [TASK], [CONSTRAINTS], and [SYSTEM].`,
                    stream: false,
                    options: {
                        temperature: 0.2,
                        num_predict: 1500
                    }
                })
            });
            if (!response.ok) {
                const err = await response.text();
                let errorMessage = `Ollama API Error: ${response.status} ${response.statusText}`;
                if (response.status === 404) {
                    try {
                        const errorData = JSON.parse(err);
                        if (errorData.error && errorData.error.includes('not found')) {
                            // Try with :latest suffix if not already present
                            const trimmedModel = this.model.trim();
                            if (!trimmedModel.includes(':')) {
                                const modelWithLatest = `${trimmedModel}:latest`;
                                // Retry with :latest suffix
                                const retryResponse = await fetch(this.apiUrl, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        model: modelWithLatest,
                                        prompt: `${systemInstruction}\n\nUser prompt to optimize:\n"${userPrompt}"\n\nOutput the structured prompt starting directly with [CONTEXT]. Include all 4 sections: [CONTEXT], [TASK], [CONSTRAINTS], and [SYSTEM].`,
                                        stream: false,
                                        options: {
                                            temperature: 0.2,
                                            num_predict: 1500
                                        }
                                    })
                                });
                                if (retryResponse.ok) {
                                    const retryResult = await retryResponse.json();
                                    if (retryResult && retryResult.response) {
                                        // Return LLM output exactly as-is - no modifications
                                        return retryResult.response.trim();
                                    }
                                }
                            }
                            errorMessage += `\n\nModel "${this.model.trim()}" is not installed in Ollama. ` +
                                `To install it, run: ollama pull ${this.model.trim()}\n\n` +
                                `Popular models: llama3.2, mistral, phi3, gemma2:2b`;
                        }
                        else {
                            errorMessage += ` - ${err}`;
                        }
                    }
                    catch {
                        errorMessage += ` - ${err}`;
                    }
                }
                else if (response.status === 0 || response.status === 500) {
                    errorMessage += `\n\nOllama is not running or not accessible at ${this.apiUrl}. ` +
                        `Please make sure Ollama is installed and running. ` +
                        `Install from https://ollama.ai`;
                }
                else if (err) {
                    errorMessage += ` - ${err}`;
                }
                throw new Error(errorMessage);
            }
            const result = await response.json();
            // Parse Ollama response format
            if (result && result.response) {
                // Return LLM output exactly as-is - no modifications
                return result.response.trim();
            }
            throw new Error("Invalid response format from Ollama.");
        }
        catch (error) {
            throw error;
        }
    }
}
exports.PromptOptimizer = PromptOptimizer;
//# sourceMappingURL=promptOptimizer.js.map