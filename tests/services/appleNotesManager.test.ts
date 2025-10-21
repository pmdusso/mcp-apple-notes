import { AppleNotesManager } from '@/services/appleNotesManager';
import { runAppleScript } from '@/utils/applescript';
import { mockNotes } from '../__fixtures__/notes';

jest.mock('@/utils/applescript');

describe('AppleNotesManager', () => {
  let manager: AppleNotesManager;
  const mockRunAppleScript = runAppleScript as jest.MockedFunction<typeof runAppleScript>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the detectAvailableAccount call in constructor
    mockRunAppleScript.mockReturnValue({
      success: true,
      output: 'OK'
    });
    manager = new AppleNotesManager();
  });

  describe('createNote', () => {
    test('should create a simple note', () => {
      mockRunAppleScript.mockClear(); // Clear constructor call
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: 'note12345'
      });

      const result = manager.createNote('Test Title', 'Test Content');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Title');
      expect(result?.content).toBe('Test Content');
      expect(mockRunAppleScript).toHaveBeenCalledWith(
        expect.stringContaining('Test Title')
      );
      expect(mockRunAppleScript).toHaveBeenCalledWith(
        expect.stringContaining('Test Content')
      );
    });

    test('should handle HTML content by escaping quotes for AppleScript', () => {
      mockRunAppleScript.mockClear(); // Clear constructor call
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: 'note123'
      });

      const result = manager.createNote(
        mockNotes.withHTML.title,
        mockNotes.withHTML.content
      );

      expect(result).not.toBeNull();
      // After clearing, createNote makes the first call
      const scriptCall = mockRunAppleScript.mock.calls[0][0];
      // The script should wrap content in HTML
      expect(scriptCall).toContain('<html><body>');
      expect(scriptCall).toContain('</body></html>');
      // Quotes in the HTML content should be escaped for AppleScript
      expect(scriptCall).toContain('\\\"');
    });

    test('should preserve line breaks', () => {
      mockRunAppleScript.mockClear(); // Clear constructor call
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: 'note123'
      });

      const result = manager.createNote(
        mockNotes.withLineBreaks.title,
        mockNotes.withLineBreaks.content
      );

      expect(result).not.toBeNull();
      // After clearing, createNote makes the first call
      const scriptCall = mockRunAppleScript.mock.calls[0][0];
      // Line breaks should be converted to <br> tags
      expect(scriptCall).toContain('<br>');
    });

    test('should handle note creation failure', () => {
      mockRunAppleScript.mockReturnValue({
        success: false,
        output: '',
        error: 'AppleScript failed'
      });

      const result = manager.createNote('Test', 'Content');

      expect(result).toBeNull();
    });
  });

  describe('searchNotes', () => {
    test('should return matching notes', () => {
      // Clear the constructor call from beforeEach
      mockRunAppleScript.mockClear();
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: 'Note 1, Note 2, Note 3'
      });

      const results = manager.searchNotes('test');

      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Note 1');
      expect(results[1].title).toBe('Note 2');
      expect(results[2].title).toBe('Note 3');
      expect(mockRunAppleScript).toHaveBeenCalledWith(
        expect.stringContaining('where name contains')
      );
    });

    test('should return empty array when no matches', () => {
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: ''
      });

      const results = manager.searchNotes('nonexistent');

      expect(results).toEqual([]);
    });

    test('should handle search errors gracefully', () => {
      mockRunAppleScript.mockReturnValue({
        success: false,
        output: '',
        error: 'Search failed'
      });

      const results = manager.searchNotes('test');

      expect(results).toEqual([]);
    });
  });

  describe('getNoteContent', () => {
    test('should retrieve note content', () => {
      mockRunAppleScript.mockClear(); // Clear constructor call
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: 'Note content here'
      });

      const content = manager.getNoteContent('Test Note');

      expect(content).toBe('Note content here');
      expect(mockRunAppleScript).toHaveBeenCalledWith(
        expect.stringContaining('get body of note')
      );
    });

    test('should return empty string for non-existent note', () => {
      mockRunAppleScript.mockReturnValue({
        success: false,
        output: '',
        error: 'Note not found'
      });

      const content = manager.getNoteContent('Nonexistent');

      expect(content).toBe('');
    });
  });
});
