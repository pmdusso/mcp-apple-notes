import type { Note } from '@/types.js';
import { runAppleScript } from '@/utils/applescript.js';

/**
 * Escapes string for safe use in AppleScript
 */
const escapeAppleScriptString = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')   // Escape backslashes first
    .replace(/"/g, '\\"')      // Escape double quotes
    .replace(/\n/g, '\\n')     // Escape newlines
    .replace(/\r/g, '\\r')     // Escape carriage returns
    .replace(/\t/g, '\\t');    // Escape tabs
};

/**
 * Generates unique ID for notes
 */
const generateNoteId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export class AppleNotesManager {
  private readonly ICLOUD_ACCOUNT = "iCloud";
  private accountName: string | null = null;

  constructor() {
    this.accountName = this.detectAvailableAccount();
  }

  /**
   * Detects which account to use (iCloud or default)
   */
  private detectAvailableAccount(): string | null {
    const testScript = `
tell application "Notes"
  tell account "${this.ICLOUD_ACCOUNT}"
    return "OK"
  end tell
end tell
    `.trim();

    const result = runAppleScript(testScript);

    if (result.success) {
      console.log('✅ Using iCloud account');
      return this.ICLOUD_ACCOUNT;
    }

    console.warn('⚠️  iCloud not available, using default account');
    return null;
  }

  /**
   * Builds AppleScript with or without account specification
   */
  private buildScript(command: string): string {
    if (this.accountName) {
      return `
tell application "Notes"
  tell account "${this.accountName}"
    ${command}
  end tell
end tell
      `.trim();
    }

    return `
tell application "Notes"
  ${command}
end tell
    `.trim();
  }

  /**
   * Gets the name of the account being used
   */
  getCurrentAccount(): string | null {
    return this.accountName;
  }

  /**
   * Creates a new note in Apple Notes
   * @param title - The note title
   * @param content - The note content
   * @param tags - Optional array of tags
   * @returns The created note object or null if creation fails
   */
  createNote(title: string, content: string, tags: string[] = []): Note | null {
    const escapedTitle = escapeAppleScriptString(title);
    const escapedContent = escapeAppleScriptString(content);

    const command = `make new note with properties {name:"${escapedTitle}", body:"${escapedContent}"}`;
    const script = this.buildScript(command);
    const result = runAppleScript(script);

    if (!result.success) {
      console.error('Failed to create note:', result.error);
      return null;
    }

    return {
      id: generateNoteId(),
      title,
      content,
      tags,
      created: new Date(),
      modified: new Date()
    };
  }

  /**
   * Searches for notes by title
   * @param query - The search query
   * @returns Array of matching notes
   */
  searchNotes(query: string): Note[] {
    const escapedQuery = escapeAppleScriptString(query);

    const command = `get name of notes where name contains "${escapedQuery}"`;
    const script = this.buildScript(command);
    const result = runAppleScript(script);

    if (!result.success) {
      console.error('Failed to search notes:', result.error);
      return [];
    }

    // AppleScript returns comma-separated list with spaces
    return result.output
      .split(', ')
      .map(title => title.trim())
      .filter(Boolean)
      .map(title => ({
        id: generateNoteId(),
        title,
        content: '',
        tags: [],
        created: new Date(),
        modified: new Date()
      }));
  }

  /**
   * Retrieves the content of a specific note
   * @param title - The exact title of the note
   * @returns The note content or empty string if not found
   */
  getNoteContent(title: string): string {
    const escapedTitle = escapeAppleScriptString(title);

    const command = `get body of note "${escapedTitle}"`;
    const script = this.buildScript(command);
    const result = runAppleScript(script);

    if (!result.success) {
      console.error('Failed to get note content:', result.error);
      return '';
    }

    return result.output;
  }
}
