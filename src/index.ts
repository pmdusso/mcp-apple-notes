import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AppleNotesManager } from "@/services/appleNotesManager.js";
import type { CreateNoteParams, SearchParams, GetNoteParams } from "@/types.js";

// Initialize notes manager with error handling
let notesManager: AppleNotesManager;

try {
  notesManager = new AppleNotesManager();
  console.log('✅ Apple Notes MCP Server initialized successfully');
  console.log(`📝 Using account: ${notesManager.getCurrentAccount() || 'default'}`);
} catch (error) {
  console.error('❌ Failed to initialize Apple Notes:', error);
  console.error('\n🔧 Troubleshooting:');
  console.error('1. Ensure Apple Notes app is installed');
  console.error('2. Configure at least one account in Notes');
  console.error('3. Grant permission when prompted');
  console.error('4. Check System Settings > Privacy & Security > Automation');
  console.error('   - Look for Terminal.app or Claude.app');
  console.error('   - Enable access to Notes.app');
  console.error('\n📖 For more help: https://github.com/punkpeye/mcp-apple-notes#troubleshooting');
  process.exit(1);
}

// Initialize the MCP server
const server = new McpServer({
  name: "apple-notes",
  version: "1.0.1",
  description: "MCP server for interacting with Apple Notes"
});

// Define tool schemas
const createNoteSchema = {
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()).optional()
};

const searchSchema = {
  query: z.string().min(1, "Search query is required")
};

const getNoteSchema = {
  title: z.string().min(1, "Note title is required")
};

// Register tools
server.tool(
  "create-note",
  createNoteSchema,
  async ({ title, content, tags = [] }: CreateNoteParams) => {
    try {
      const note = notesManager.createNote(title, content, tags);
      if (!note) {
        return {
          content: [{
            type: "text",
            text: "Failed to create note. Please check your Apple Notes configuration."
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `✅ Note created successfully: "${note.title}"`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error creating note: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "search-notes",
  searchSchema,
  async ({ query }: SearchParams) => {
    try {
      const notes = notesManager.searchNotes(query);
      const message = notes.length
        ? `Found ${notes.length} notes:\n${notes.map(note => `• ${note.title}`).join('\n')}`
        : "No notes found matching your query";

      return {
        content: [{
          type: "text",
          text: message
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error searching notes: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "get-note-content",
  getNoteSchema,
  async ({ title }: GetNoteParams) => {
    try {
      const content = notesManager.getNoteContent(title);
      return {
        content: [{
          type: "text",
          text: content || "Note not found"
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving note content: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
