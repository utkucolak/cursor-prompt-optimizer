import * as vscode from 'vscode';

export class PromptOptimizer {
    private model: string = '';
    private readonly apiUrl: string = 'http://localhost:11434/api/generate';

    constructor() {
        this.updateModel();
    }

    private updateModel(): void {
        const config = vscode.workspace.getConfiguration('cursorTokenOptimizer');
        this.model = (config.get<string>('model') || 'llama3.2').trim();
    }

    async optimize(prompt: string): Promise<string> {
        this.updateModel();
        return this.optimizePrompt(prompt);
    }

    private async optimizePrompt(userPrompt: string): Promise<string> {
        const systemInstruction = `You are a token-efficient prompt rewriter for software engineering queries.

GOAL: rewrite the user's request into a compact English specification with three blocks, in this exact order:
[CONTEXT]
<one short line of background or environment, or "None.">
[TASK]
<one or two imperative sentences stating exactly what to do>
[CONSTRAINTS]
<short bullet list of explicit constraints, or "None.">

RULES:
1. Translate any non-English text to concise English (English tokenizes cheaper).
2. Strip pleasantries and filler ("please", "thanks", "could you", "kolay gelsin", etc.).
3. Preserve every concrete identifier (file paths, function/class names, error messages) verbatim.
4. Output ONLY the three blocks above. No code, no extra headers, no commentary.
5. Keep the total output as short as possible.`;

        const modelToUse = this.model.trim();
        const primaryPrompt = `${systemInstruction}\n\n----- USER MESSAGE -----\n${userPrompt}\n\nRewrite now:`;

        let candidate = await this.runModel(modelToUse, primaryPrompt);
        let validation = this.validateLight(candidate);

        for (let attempt = 0; attempt < 2 && !validation.valid; attempt++) {
            const repairPrompt = `${systemInstruction}

Your previous output was invalid:
${validation.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Original user prompt:
${userPrompt}

Previous output:
${candidate}

Rewrite now. Output ONLY the three blocks:`;
            candidate = await this.runModel(modelToUse, repairPrompt);
            validation = this.validateLight(candidate);
        }

        if (!validation.valid) {
            return userPrompt;
        }
        return this.applyTokenGuard(userPrompt, candidate);
    }

    private async runModel(model: string, prompt: string): Promise<string> {
        let response = await this.callOllama(model, prompt);

        if (!response.ok && response.status === 404 && !model.includes(':')) {
            const retry = await this.callOllama(`${model}:latest`, prompt);
            if (retry.ok) {
                response = retry;
            }
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(this.formatOllamaError(response.status, response.statusText, body));
        }

        const result = await response.json() as { response?: string };
        if (!result || typeof result.response !== 'string') {
            throw new Error('Invalid response format from Ollama.');
        }
        return this.cleanModelOutput(result.response.trim());
    }

    private async callOllama(model: string, prompt: string): Promise<Response> {
        return fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    temperature: 0,
                    top_p: 0.9,
                    num_predict: 400,
                    stop: ['----- USER MESSAGE -----', '```']
                }
            })
        });
    }

    private formatOllamaError(status: number, statusText: string, body: string): string {
        let msg = `Ollama API Error: ${status} ${statusText}`;
        if (status === 404) {
            try {
                const data = JSON.parse(body) as { error?: string };
                if (data.error && data.error.includes('not found')) {
                    return `${msg}\n\nModel "${this.model}" is not installed in Ollama. ` +
                        `To install it, run: ollama pull ${this.model}\n\n` +
                        `Popular models: llama3.2, mistral, phi3, gemma2:2b`;
                }
            } catch {
                // fall through
            }
        } else if (status === 0 || status === 500) {
            msg += `\n\nOllama is not running or not accessible at ${this.apiUrl}. ` +
                `Please make sure Ollama is installed and running. Install from https://ollama.ai`;
        }
        if (body) {
            msg += ` - ${body}`;
        }
        return msg;
    }

    private cleanModelOutput(text: string): string {
        let t = text.trim();
        t = t.replace(/```[\s\S]*?```/g, '').trim();
        const idx = t.search(/\[CONTEXT\]/i);
        if (idx > 0) {
            t = t.slice(idx).trim();
        }
        return t;
    }

    private validateLight(text: string): { valid: boolean; reasons: string[] } {
        const reasons: string[] = [];
        if (!/\[CONTEXT\]/i.test(text)) reasons.push('Missing [CONTEXT] block.');
        if (!/\[TASK\]/i.test(text)) reasons.push('Missing [TASK] block.');
        if (!/\[CONSTRAINTS\]/i.test(text)) reasons.push('Missing [CONSTRAINTS] block.');
        if (text.length < 10) reasons.push('Output too short.');
        return { valid: reasons.length === 0, reasons };
    }

    private approxTokens(s: string): number {
        let n = 0;
        for (const ch of s) n += /[\x00-\x7F]/.test(ch) ? 0.25 : 1;
        return Math.ceil(n);
    }

    private applyTokenGuard(rawUserText: string, finalized: string): string {
        const optimizedTokens = this.approxTokens(finalized);
        const rawTokens = this.approxTokens(rawUserText);
        if (optimizedTokens >= rawTokens * 0.95) {
            return rawUserText;
        }
        return finalized;
    }
}
