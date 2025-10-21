import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Mock MCP Client for integration testing
 * Creates an in-memory connection between a client and server for testing
 */
export class MockMCPClient {
  private client: Client;
  private clientTransport: InMemoryTransport;
  private serverTransport: InMemoryTransport;

  constructor(private server: McpServer) {
    // Create linked pair of transports for in-memory communication
    [this.clientTransport, this.serverTransport] = InMemoryTransport.createLinkedPair();

    // Create client
    this.client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });
  }

  /**
   * Connect the client and server
   */
  async connect() {
    // Connect server to its transport
    await this.server.connect(this.serverTransport);

    // Connect client to its transport
    await this.client.connect(this.clientTransport);
  }

  /**
   * List all available tools from the server
   */
  async listTools() {
    const response = await this.client.listTools();
    return response.tools;
  }

  /**
   * Call a tool with given parameters
   */
  async callTool(name: string, params: any) {
    const response = await this.client.callTool({
      name,
      arguments: params
    });
    return response;
  }

  /**
   * Close the connection
   */
  async close() {
    await this.client.close();
    await this.server.close();
  }
}
