import { execSync } from 'child_process';
import type { AppleScriptResult } from '@/types.js';

/**
 * Executes an AppleScript command and returns the result
 * @param script - The AppleScript command to execute
 * @returns Object containing success status and output/error
 */
export function runAppleScript(script: string): AppleScriptResult {
  try {
    // Trim and sanitize the script
    const sanitizedScript = script.trim().replace(/[\r\n]+/g, ' ');

    // Execute the AppleScript command
    const output = execSync(`osascript -e '${sanitizedScript}'`, {
      encoding: 'utf8',
      timeout: 10000 // 10 second timeout
    });

    return {
      success: true,
      output: output.trim()
    };
  } catch (error) {
    console.error('AppleScript execution failed:', error);

    return {
      success: false,
      output: '',
      error: error instanceof Error
        ? error.message
        : 'Unknown error occurred while executing AppleScript'
    };
  }
}
