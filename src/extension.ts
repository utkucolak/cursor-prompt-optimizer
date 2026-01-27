import * as vscode from 'vscode';
import { PromptOptimizer } from './promptOptimizer';

export function activate(context: vscode.ExtensionContext) {
    const optimizer = new PromptOptimizer();

    // Register the optimize prompt command
    const optimizeCommand = vscode.commands.registerCommand(
        'cursor-token-optimizer.optimizePrompt',
        async () => {
            // Show input box to enter prompt
            const userPrompt = await vscode.window.showInputBox({
                prompt: 'Enter your prompt to optimize',
                placeHolder: 'Type your prompt here...',
                ignoreFocusOut: true
            });

            if (!userPrompt || userPrompt.trim() === '') {
                return; // User cancelled or entered empty prompt
            }

            // Show progress indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Optimizing prompt...",
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ increment: 0, message: "Analyzing prompt..." });
                    
                    const optimizedPrompt = await optimizer.optimize(userPrompt.trim());
                    
                    progress.report({ increment: 100, message: "Optimization complete!" });
                    
                    // Show the optimized prompt and ask what to do with it
                    const action = await vscode.window.showInformationMessage(
                        'Prompt optimized! Choose an action:',
                        'Send to Cursor Chat',
                        'Copy to Clipboard',
                        'Show Preview'
                    );

                    if (action === 'Send to Cursor Chat') {
                        await sendToCursorChat(optimizedPrompt);
                    } else if (action === 'Copy to Clipboard') {
                        await vscode.env.clipboard.writeText(optimizedPrompt);
                        vscode.window.showInformationMessage('Optimized prompt copied to clipboard!');
                    } else if (action === 'Show Preview') {
                        await showPreview(optimizedPrompt, userPrompt);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(`Failed to optimize prompt: ${errorMessage}`);
                }
            });
        }
    );

    context.subscriptions.push(optimizeCommand);
}

/**
 * Attempts to send the optimized prompt to Cursor's chat/composer
 * Since Cursor doesn't expose a direct API, we copy to clipboard and try to open chat
 */
async function sendToCursorChat(optimizedPrompt: string): Promise<void> {
    // Always copy to clipboard first
    await vscode.env.clipboard.writeText(optimizedPrompt);
    
    // Try to open Cursor chat using various commands
    const commandsToTry = [
        'cursor.chat.focus',
        'cursor.composer.focus',
        'cursor.chat.new',
        'cursor.composer.new',
        'workbench.action.chat.open',
        'workbench.action.quickChat.toggle',
        'workbench.action.chat.newSession'
    ];
    
    let chatOpened = false;
    
    for (const cmd of commandsToTry) {
        try {
            await vscode.commands.executeCommand(cmd);
            chatOpened = true;
            // Give chat time to open
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
        } catch {
            continue;
        }
    }
    
    if (chatOpened) {
        // Try to paste the text
        try {
            // Wait a bit more for the input to be ready
            await new Promise(resolve => setTimeout(resolve, 300));
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            vscode.window.showInformationMessage('Optimized prompt pasted to Cursor chat!');
        } catch {
            // Paste failed, but chat is open - user can paste manually
            vscode.window.showInformationMessage(
                'Chat opened! The optimized prompt is in your clipboard. Press Ctrl+V / Cmd+V to paste it.',
                'OK'
            );
        }
    } else {
        // Couldn't open chat automatically
        vscode.window.showWarningMessage(
            `Optimized prompt copied to clipboard!\n\n` +
            `To send it to Cursor:\n` +
            `1. Press Ctrl+L (or Cmd+L on Mac) to open chat\n` +
            `2. Press Ctrl+V (or Cmd+V on Mac) to paste`,
            'OK'
        );
    }
}

/**
 * Shows a preview of the optimized prompt in a diff view
 */
async function showPreview(optimizedPrompt: string, originalPrompt: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
        content: `=== OPTIMIZED PROMPT ===\n\n${optimizedPrompt}\n\n=== ORIGINAL PROMPT ===\n\n${originalPrompt}`,
        language: 'plaintext'
    });
    await vscode.window.showTextDocument(doc);
    
    // Also copy to clipboard
    await vscode.env.clipboard.writeText(optimizedPrompt);
    vscode.window.showInformationMessage('Optimized prompt shown in preview. Also copied to clipboard.');
}

export function deactivate() {}
