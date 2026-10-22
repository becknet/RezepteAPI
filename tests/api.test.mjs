import test from "node:test";
import assert from "node:assert/strict";
import {
  request,
  pool,
  rankCandidates,
  findRecipes,
  getIngredients,
} from "../js/api.js";
const ok = (meals) => ({ ok: true, json: async () => ({ meals }) });
test("request encodes query parameters and accepts null as no results", async () => {
  const rows = await request(
    "filter.php",
    { i: "test & rice" },
    {
      fetcher: async (url) => {
        assert.equal(url.searchParams.get("i"), "test & rice");
        return ok(null);
      },
    },
  );
  assert.deepEqual(rows, []);
});
test("HTTP errors, invalid JSON shape and invalid catalogue are rejected", async () => {
  await assert.rejects(
    request(
      "test.php",
      { id: "http" },
      { fetcher: async () => ({ ok: false, status: 503 }) },
    ),
    /503/,
  );
  await assert.rejects(
    request(
      "test.php",
      { id: "shape" },
      { fetcher: async () => ({ ok: true, json: async () => ({ bad: [] }) }) },
    ),
    /unerwartete/,
  );
  await assert.rejects(
    getIngredients({ fetcher: async () => ok([{ unknown: "x" }]) }),
    /leer/,
  );
});
test("pool limits concurrency to four and retains partial failures", async () => {
  let active = 0,
    maximum = 0;
  const result = await pool(
    Array.from({ length: 20 }, (_, i) => i),
    4,
    async (i) => {
      active++;
      maximum = Math.max(active, maximum);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      if (i === 5) throw new Error("failed");
      return i;
    },
  );
  assert.equal(maximum, 4);
  assert.equal(result[5].status, "rejected");
  assert.equal(result[19].value, 19);
});
test("candidate ranking deduplicates within and across filter responses", () => {
  const ranks = rankCandidates([
    [{ idMeal: "1" }, { idMeal: "1" }, { idMeal: "2" }, null],
    [{ idMeal: "2" }, { idMeal: "<script>" }],
  ]);
  assert.deepEqual(ranks, [
    { id: "2", hits: 2 },
    { id: "1", hits: 1 },
  ]);
});
test("search caps details at 60 and surfaces partial failures", async () => {
  let detailCount = 0;
  const result = await findRecipes(
    ["test-search-good", "test-search-failure"],
    {
      fetcher: async (url) => {
        if (url.pathname.endsWith("filter.php")) {
          if (url.searchParams.get("i") === "test-search-failure")
            throw new TypeError("offline");
          return ok(
            Array.from({ length: 65 }, (_, i) => ({
              idMeal: String(i + 9000),
            })),
          );
        }
        detailCount++;
        const id = url.searchParams.get("i");
        if (id === "9001") throw new Error("detail failed");
        return ok([
          { idMeal: id, strMeal: `Recipe ${id}`, strInstructions: "Cook." },
        ]);
      },
    },
  );
  assert.equal(detailCount, 60);
  assert.equal(result.total, 65);
  assert.equal(result.examined, 60);
  assert.equal(result.meals.length, 59);
  assert.equal(result.failures, 2);
});
test("search with no matches returns empty data", async () => {
  const result = await findRecipes(["test-no-match"], {
    fetcher: async () => ok(null),
  });
  assert.equal(result.meals.length, 0);
});
test("aborted search cannot return stale results", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    findRecipes(["test-aborted"], {
      signal: controller.signal,
      fetcher: async () => ok([]),
    }),
    { name: "AbortError" },
  );
});
test("failed requests are retryable", async () => {
  await assert.rejects(
    request(
      "retry.php",
      { id: "retry" },
      {
        fetcher: async () => {
          throw new TypeError("offline");
        },
      },
    ),
  );
  assert.deepEqual(
    await request(
      "retry.php",
      { id: "retry" },
      { fetcher: async () => ok([]) },
    ),
    [],
  );
});
test("invalid catalogue data does not poison the retry cache", async () => {
  await assert.rejects(getIngredients({ fetcher: async () => ok([]) }), /leer/);
  assert.deepEqual(
    await getIngredients({
      fetcher: async () =>
        ok([{ strIngredient: "Rice" }, { strIngredient: "Chicken" }]),
    }),
    ["Chicken", "Rice"],
  );
});
test("malformed JSON is rejected rather than rendered", async () => {
  await assert.rejects(
    request(
      "test.php",
      { id: "malformed-json" },
      {
        fetcher: async () => ({
          ok: true,
          json: async () => {
            throw new SyntaxError("invalid JSON");
          },
        }),
      },
    ),
    SyntaxError,
  );
});
