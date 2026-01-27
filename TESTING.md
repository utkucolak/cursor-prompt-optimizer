# Testing Guide for Cursor Token Optimizer Extension

## Prerequisites

1. **HuggingFace Token (Recommended)**
   - Get a free token at: https://huggingface.co/settings/tokens
   - Configure it in VS Code/Cursor settings:
     - Open Settings (Ctrl+, or Cmd+,)
     - Search for "Cursor Token Optimizer"
     - Add your token in `cursorTokenOptimizer.huggingFaceToken`

2. **Optional: Configure Model**
   - Default model: `HuggingFaceH4/zephyr-7b-beta`
   - You can change it in settings: `cursorTokenOptimizer.model`
   - Other models to try:
     - `meta-llama/Llama-2-7b-chat-hf`
     - `mistralai/Mistral-7B-Instruct-v0.1`

## How to Test

### Method 1: Extension Development Host (Recommended)

1. **Open the project in VS Code/Cursor**
   ```bash
   code .
   # or
   cursor .
   ```

2. **Press F5** (or go to Run > Start Debugging)
   - This will open a new "Extension Development Host" window

3. **In the Extension Development Host window:**
   - Open `test-prompts.txt` (or create a new file)
   - Select a test prompt (or any text you want to optimize)
   - Press `Ctrl+Shift+O` (or `Cmd+Shift+O` on Mac)
   - Or use Command Palette: `Ctrl+Shift+P` → "Optimize Prompt"

4. **Observe the results:**
   - The selected text should be replaced with the optimized version
   - Check the Output panel (View > Output) for any console logs
   - Look for notifications about the optimization status

### Method 2: Install and Test

1. **Package the extension:**
   ```bash
   npm install -g vsce
   vsce package
   ```

2. **Install the .vsix file:**
   - In VS Code/Cursor: Extensions view → "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

3. **Test as above** (but in your regular VS Code/Cursor window)

## What to Check

✅ **Translation**: Non-English prompts should be translated to English  
✅ **Structure**: Prompts should have [CONTEXT], [TASK], [CONSTRAINTS] tags  
✅ **Conciseness**: Verbose prompts should be shortened  
✅ **Redundancy Removal**: Phrases like "please note that", "I would like to" should be removed  
✅ **Error Handling**: If API fails, should show error message and return original prompt  

## Troubleshooting

### "HuggingFace token not configured" warning
- This is expected if you haven't set a token
- Some models work without tokens but may have rate limits
- Add your token in settings to avoid this

### "HF API Error" messages
- Check your internet connection
- Verify your HuggingFace token is valid
- Some models may be loading (first request can take time)
- Try a different model if one doesn't work

### Extension not activating
- Check the Output panel → "Log (Extension Host)"
- Make sure you're in the Extension Development Host window (not the main window)
- Verify the extension compiled successfully (`npm run compile`)

## Test Cases

See `test-prompts.txt` for sample prompts to test with:
1. Simple English prompt
2. Non-English prompt (French)
3. Already structured prompt
4. Verbose prompt with redundancy
5. Mixed language prompt
