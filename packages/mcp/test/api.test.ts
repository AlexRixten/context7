import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchLibraryContext, searchLibraries } from "../src/lib/api.js";

// The api layer calls global fetch; stub it per case.
afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Partial<Response> & { ok: boolean }) {
  // fetchLibraryContext reads response.headers (auth-prompt signal), so every
  // stub needs a real Headers object.
  const full = { headers: new Headers(), ...response } as Response;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => full)
  );
}

describe("fetchLibraryContext", () => {
  test("flags a non-ok API response as an error", async () => {
    // A failed lookup (e.g. 404 for a nonexistent library) must be marked so
    // the tool result can set isError:true instead of defaulting to success.
    stubFetch({
      ok: false,
      status: 404,
      json: async () => ({ message: "Library not found." }),
    });

    const result = await fetchLibraryContext({ query: "q", libraryId: "/no/such-lib" });
    expect(result.isError).toBe(true);
    expect(result.data).toBe("Library not found.");
  });

  test("flags a network failure as an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const result = await fetchLibraryContext({ query: "q", libraryId: "/vercel/next.js" });
    expect(result.isError).toBe(true);
    expect(result.data).toContain("Error fetching library context");
  });

  test("flags an empty documentation body as an error", async () => {
    // A 200 with no body means no docs were retrieved (often an invalid or
    // not-yet-finalized library), so the caller must see it as a failure.
    stubFetch({
      ok: true,
      status: 200,
      text: async () => "",
    });

    const result = await fetchLibraryContext({ query: "q", libraryId: "/vercel/next.js" });
    expect(result.isError).toBe(true);
    expect(result.data).toContain("Documentation not found or not finalized");
  });

  test("does not flag a successful documentation response", async () => {
    stubFetch({
      ok: true,
      status: 200,
      text: async () => "# Some real documentation",
    });

    const result = await fetchLibraryContext({ query: "q", libraryId: "/vercel/next.js" });
    expect(result.isError).toBeUndefined();
    expect(result.data).toBe("# Some real documentation");
  });

  // Three different outcomes arrive as HTTP 404; only the code separates them.
  test("does not flag a query that matched no snippets", async () => {
    stubFetch({
      ok: false,
      status: 404,
      json: async () => ({ error: "no_relevant_snippets", message: "No documentation matched." }),
    });

    const result = await fetchLibraryContext({ query: "q", libraryId: "/vercel/next.js" });
    expect(result.isError).toBe(false);
    expect(result.data).toBe("No documentation matched.");
  });

  test("flags library_not_found despite the shared 404 status", async () => {
    stubFetch({
      ok: false,
      status: 404,
      json: async () => ({ error: "library_not_found", message: 'Library "/no/such" not found.' }),
    });

    const result = await fetchLibraryContext({ query: "q", libraryId: "/no/such" });
    expect(result.isError).toBe(true);
  });
});

describe("searchLibraries", () => {
  test("does not flag a search that matched no libraries", async () => {
    stubFetch({
      ok: false,
      status: 404,
      json: async () => ({
        error: "no_libraries_found",
        message: 'No libraries found for "zzzz". Try a different search term.',
      }),
    });

    const result = await searchLibraries("q", "zzzz");
    expect(result.isError).toBe(false);
    expect(result.results).toEqual([]);
    // The API's guidance still reaches the model.
    expect(result.error).toContain("Try a different search term");
  });

  test("flags a real search API failure", async () => {
    stubFetch({ ok: false, status: 401, json: async () => ({ message: "Invalid API key." }) });

    const result = await searchLibraries("q", "Next.js");
    expect(result.isError).toBe(true);
    expect(result.error).toBe("Invalid API key.");
  });
});
