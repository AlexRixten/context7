---
"@upstash/context7-mcp": patch
---

Failed tool calls now set `isError: true` on their results, as the MCP spec requires for tool execution errors. `query-docs` flags API failures, network errors, and empty documentation bodies; `resolve-library-id` flags search API failures. Previously these returned error text as a successful result, so clients that branch on `isError` treated messages like "Library not found" as documentation. An empty search result set is still a success. The error text itself is unchanged.
