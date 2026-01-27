# Cursor Token Optimizer Extension

An extension for Cursor IDE that optimizes user prompts to reduce token costs using local LLM models via Ollama.

## Features

- **Language Translation**: Automatically translates non-English prompts to English (English prompts are typically cheaper)
- **Prompt Structuring**: Ensures prompts have clear sections: [CONTEXT], [TASK], [CONSTRAINTS], [SYSTEM]
- **Token Optimization**: Applies various techniques to reduce token usage while maintaining prompt quality
- **Expert Developer Persona**: Adds system instructions to ensure clean, maintainable code generation
- **Easy Integration**: Automatically sends optimized prompts to Cursor chat or copies to clipboard

## Quick Setup

### Prerequisites

1. **Install Ollama**: Download and install from [https://ollama.ai](https://ollama.ai)

2. **Install a Model**: Pull a model (default is `llama3.2`):
   ```bash
   ollama pull llama3.2
   ```
   
   Other recommended models:
   ```bash
   ollama pull mistral
   ollama pull phi3
   ollama pull gemma2:2b
   ```

3. **Verify Ollama is Running**: 
   ```bash
   ollama list
   ```
   This should show your installed models.

### Installation

#### Option 1: Install from VSIX (Recommended)

1. **Download the `.vsix` file** from the releases page (or build it yourself - see Development section)

2. **Install in Cursor**:
   - Open Cursor
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Install from VSIX"
   - Select the `.vsix` file
   - Restart Cursor if prompted

#### Option 2: Install from Source (For Development)

1. **Clone or download this extension**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Compile the extension**:
   ```bash
   npm run compile
   ```

4. **Press F5** to run the extension in a new Extension Development Host window

## Usage

1. **Press `Ctrl+Shift+O`** (or `Cmd+Shift+O` on Mac) to open the prompt optimizer
2. **Enter your prompt** in the input box
3. **Choose an action**:
   - **Send to Cursor Chat**: Automatically opens Cursor chat and pastes the optimized prompt
   - **Copy to Clipboard**: Copies the optimized prompt for manual use
   - **Show Preview**: Displays a side-by-side comparison of original vs optimized

## Configuration

### Change the Ollama Model

1. Open Cursor Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Cursor Token Optimizer"
3. Set `cursorTokenOptimizer.model` to your preferred model (e.g., `mistral`, `phi3`, `gemma2:2b`)

Or edit `settings.json` directly:
```json
{
  "cursorTokenOptimizer.model": "mistral"
}
```

## How It Works

The extension uses a local Ollama model to:
1. Translate non-English prompts to English
2. Structure prompts with [CONTEXT], [TASK], [CONSTRAINTS], and [SYSTEM] sections
3. Remove unnecessary words and fluff
4. Add expert developer persona instructions
5. Optimize for token efficiency

## Troubleshooting

### "Ollama API Error: 404 Not Found"
- Make sure the model is installed: `ollama pull <model-name>`
- Check the model name in settings matches the installed model

### "Ollama is not running or not accessible"
- Ensure Ollama is running: `ollama list` should work
- Check that Ollama is accessible at `http://localhost:11434`

### Extension not working
- Make sure you've compiled: `npm run compile`
- Check the Output panel for error messages
- Restart Cursor after installation

## Development

### Building the Extension

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

### Packaging for Distribution

To create a `.vsix` file for distribution:

```bash
# Install VS Code Extension Manager
npm install -g @vscode/vsce

# Package the extension
vsce package
```

This creates a `.vsix` file that can be installed directly in Cursor.
