import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MockMCPClient } from '../__helpers__/mcp-client.js';
import { runAppleScript } from '@/utils/applescript.js';
import { z } from 'zod';
import { AppleNotesManager } from '@/services/appleNotesManager.js';

// Mock the AppleScript utility
jest.mock('@/utils/applescript.js');
const mockRunAppleScript = runAppleScript as jest.MockedFunction<typeof runAppleScript>;

/**
 * Creates an MCP server instance for testing
 * This is a standalone version that doesn't initialize the AppleNotesManager
 */
function createTestMCPServer(): McpServer {
  // Create a mock notes manager for testing
  const notesManager = new AppleNotesManager();

  // Initialize the MCP server
  const server = new McpServer({
    name: 'apple-notes',
    version: '1.0.1',
    description: 'MCP server for interacting with Apple Notes'
  });

  // Define tool schemas (same as in index.ts)
  const createNoteSchema = {
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    tags: z.array(z.string()).optional()
  };

  const searchSchema = {
    query: z.string().min(1, 'Search query is required')
  };

  const getNoteSchema = {
    title: z.string().min(1, 'Note title is required')
  };

  // Register tools (same as in index.ts)
  server.tool(
    'create-note',
    createNoteSchema,
    async ({ title, content, tags = [] }: any) => {
      try {
        const note = notesManager.createNote(title, content, tags);
        if (!note) {
          return {
            content: [{
              type: 'text',
              text: 'Failed to create note. Please check your Apple Notes configuration.'
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text',
            text: `Note created successfully: "${note.title}"`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error creating note: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'search-notes',
    searchSchema,
    async ({ query }: any) => {
      try {
        const notes = notesManager.searchNotes(query);
        const message = notes.length
          ? `Found ${notes.length} notes:\n${notes.map(note => `• ${note.title}`).join('\n')}`
          : 'No notes found matching your query';

        return {
          content: [{
            type: 'text',
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error searching notes: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  server.tool(
    'get-note-content',
    getNoteSchema,
    async ({ title }: any) => {
      try {
        const content = notesManager.getNoteContent(title);
        return {
          content: [{
            type: 'text',
            text: content || 'Note not found'
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error retrieving note content: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    }
  );

  return server;
}

describe('MCP Server Integration', () => {
  let server: McpServer;
  let client: MockMCPClient;

  beforeEach(async () => {
    // Mock AppleScript to return success for account detection
    mockRunAppleScript.mockReturnValue({
      success: true,
      output: 'OK',
      error: undefined
    });

    server = createTestMCPServer();
    client = new MockMCPClient(server);
    await client.connect();
  });

  afterEach(async () => {
    await client.close();
    jest.clearAllMocks();
  });

  describe('Tool Listing', () => {
    test('should list available tools', async () => {
      const tools = await client.listTools();

      expect(tools).toHaveLength(3);

      // Check for create-note tool
      const createNoteTool = tools.find(t => t.name === 'create-note');
      expect(createNoteTool).toBeDefined();
      expect(createNoteTool?.inputSchema).toBeDefined();
      expect(createNoteTool?.inputSchema.properties).toHaveProperty('title');
      expect(createNoteTool?.inputSchema.properties).toHaveProperty('content');
      expect(createNoteTool?.inputSchema.properties).toHaveProperty('tags');

      // Check for search-notes tool
      const searchNotesTool = tools.find(t => t.name === 'search-notes');
      expect(searchNotesTool).toBeDefined();
      expect(searchNotesTool?.inputSchema.properties).toHaveProperty('query');

      // Check for get-note-content tool
      const getNoteContentTool = tools.find(t => t.name === 'get-note-content');
      expect(getNoteContentTool).toBeDefined();
      expect(getNoteContentTool?.inputSchema.properties).toHaveProperty('title');
    });
  });

  describe('Tool Invocations', () => {
    test('should create a note via MCP', async () => {
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: 'note123',
        error: undefined
      });

      const result = await client.callTool('create-note', {
        title: 'Test Note',
        content: 'Test Content',
        tags: ['test', 'mcp']
      });

      expect((result as any).content).toHaveLength(1);
      expect((result as any).content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('created')
      });
      expect((result as any).isError).toBeUndefined();
    });

    test('should search notes via MCP', async () => {
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: 'Note 1, Note 2',
        error: undefined
      });

      const result = await client.callTool('search-notes', {
        query: 'test'
      });

      expect((result as any).content).toHaveLength(1);
      expect((result as any).content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Found 2 notes')
      });
    });

    test('should get note content via MCP', async () => {
      mockRunAppleScript.mockReturnValue({
        success: true,
        output: 'Content of the note',
        error: undefined
      });

      const result = await client.callTool('get-note-content', {
        title: 'My Note'
      });

      expect((result as any).content).toHaveLength(1);
      expect((result as any).content[0]).toMatchObject({
        type: 'text',
        text: 'Content of the note'
      });
    });
  });

  describe('Parameter Validation', () => {
    test('should reject create-note with missing title', async () => {
      await expect(
        client.callTool('create-note', {
          content: 'Content without title'
        })
      ).rejects.toThrow();
    });

    test('should reject create-note with missing content', async () => {
      await expect(
        client.callTool('create-note', {
          title: 'Title without content'
        })
      ).rejects.toThrow();
    });

    test('should reject create-note with empty title', async () => {
      await expect(
        client.callTool('create-note', {
          title: '',
          content: 'Content'
        })
      ).rejects.toThrow();
    });

    test('should reject search-notes with missing query', async () => {
      await expect(
        client.callTool('search-notes', {})
      ).rejects.toThrow();
    });

    test('should reject get-note-content with missing title', async () => {
      await expect(
        client.callTool('get-note-content', {})
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle AppleScript failures gracefully when creating note', async () => {
      mockRunAppleScript.mockReturnValue({
        success: false,
        output: '',
        error: 'AppleScript error'
      });

      const result = await client.callTool('create-note', {
        title: 'Test',
        content: 'Content'
      });

      expect((result as any).content).toHaveLength(1);
      expect((result as any).content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Failed')
      });
      expect((result as any).isError).toBe(true);
    });

    test('should handle search errors gracefully', async () => {
      mockRunAppleScript.mockReturnValue({
        success: false,
        output: '',
        error: 'Search failed'
      });

      const result = await client.callTool('search-notes', {
        query: 'test'
      });

      expect((result as any).content).toHaveLength(1);
      expect((result as any).content[0].text).toBe('No notes found matching your query');
    });

    test('should handle get-note-content errors gracefully', async () => {
      mockRunAppleScript.mockReturnValue({
        success: false,
        output: '',
        error: 'Note not found'
      });

      const result = await client.callTool('get-note-content', {
        title: 'Nonexistent'
      });

      expect((result as any).content).toHaveLength(1);
      expect((result as any).content[0].text).toBe('Note not found');
    });

    test('should handle invalid tool names', async () => {
      await expect(
        client.callTool('non-existent-tool', {})
      ).rejects.toThrow();
    });
  });
});
