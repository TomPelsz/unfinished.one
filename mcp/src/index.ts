// unfinished.one MCP server: stateless Streamable HTTP, read-only, data bundled at build.
// Kept dependency-free on purpose: a handful of JSON-RPC methods, no sessions, no storage.
import { handle, type Json } from './server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id',
};

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/') return Response.redirect('https://unfinished.one/llms.txt', 302);
    if (url.pathname !== '/mcp') return new Response('Not found', { status: 404, headers: CORS });
    // Stateless server: no server-initiated stream to offer.
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { ...CORS, Allow: 'POST, OPTIONS' } });

    let body: Json | Json[];
    try {
      body = await request.json();
    } catch {
      return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400, headers: CORS });
    }
    const replies = (Array.isArray(body) ? body : [body]).map(handle).filter((r): r is Json => r !== null);
    if (replies.length === 0) return new Response(null, { status: 202, headers: CORS });
    return Response.json(Array.isArray(body) ? replies : replies[0], { headers: CORS });
  },
};
