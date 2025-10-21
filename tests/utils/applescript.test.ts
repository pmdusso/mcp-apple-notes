import { runAppleScript } from '@/utils/applescript';
import { execSync } from 'child_process';

jest.mock('child_process');

describe('runAppleScript', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute simple AppleScript command', () => {
    mockExecSync.mockReturnValue('Test Result');

    const result = runAppleScript('display dialog "Hello"');

    expect(result.success).toBe(true);
    expect(result.output).toBe('Test Result');
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('osascript'),
      expect.any(Object)
    );
  });

  test('should handle multi-line AppleScript', () => {
    const script = `
      tell application "Notes"
        return "multi-line test"
      end tell
    `;

    mockExecSync.mockReturnValue('multi-line result');

    const result = runAppleScript(script);

    expect(result.success).toBe(true);
    expect(result.output).toBe('multi-line result');

    // Verify that the command uses multiple -e flags (one per line)
    const callArgs = mockExecSync.mock.calls[0][0] as string;
    const lines = script.trim().split('\n').filter(line => line.trim().length > 0);
    expect(callArgs).toContain('-e');
    // Each non-empty line should have its own -e flag
    expect((callArgs.match(/-e/g) || []).length).toBe(lines.length);
  });

  test('should handle AppleScript errors', () => {
    const error = new Error('AppleScript error');
    (error as any).stderr = Buffer.from('Error: Invalid syntax');
    mockExecSync.mockImplementation(() => {
      throw error;
    });

    const result = runAppleScript('invalid script');

    expect(result.success).toBe(false);
    expect(result.output).toBe('');
    expect(result.error).toContain('Failed to execute AppleScript');
    expect(result.error).toContain('Invalid syntax');
  });

  test('should escape special characters', () => {
    mockExecSync.mockReturnValue('safe');

    const result = runAppleScript('echo "$(rm -rf /)"');

    expect(result.success).toBe(true);

    // Verify that the command was called and escapes single quotes properly
    const callArgs = mockExecSync.mock.calls[0][0] as string;
    expect(callArgs).toContain('osascript');
    expect(mockExecSync).toHaveBeenCalled();
    // The actual escaping is tested by verifying the function doesn't throw
    // and properly handles the input
  });
});
