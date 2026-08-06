---
"@upstash/context7-mcp": patch
---

Failed tool calls now set `isError: true` on their results, as the MCP spec requires for tool execution errors. `query-docs` flags API failures, network errors, and empty documentation bodies; `resolve-library-id` flags search API failures. Previously these returned error text as a successful result, so clients that branch on `isError` treated messages like "Library not found" as documentation. A lookup that simply matched nothing stays a success: the API reports those as a 404 carrying `no_libraries_found` or `no_relevant_snippets`, which is a completed search with no results. The error text itself is unchanged.
