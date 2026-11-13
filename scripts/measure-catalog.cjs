const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true }),
    runs = [];
  try {
    for (let i = 0; i < 3; i++) {
      const p = await b.newPage();
      let requests = [];
      p.on("request", (r) => {
        if (r.url().includes("/api/")) requests.push(new URL(r.url()).pathname);
      });
      const began = Date.now();
      await p.goto((process.argv[2] ?? "http://localhost:4207") + "/products");
      await p
        .getByRole("heading", { name: "Desk Pen Set · Travel", exact: true })
        .waitFor();
      const loaded = Date.now() - began;
      let started = Date.now();
      await p
        .getByRole("searchbox", { name: "Search products", exact: true })
        .fill("Roasted Coffee");
      await p
        .getByRole("button", { name: "Apply filters", exact: true })
        .click();
      await p
        .getByRole("heading", { name: "Roasted Coffee · Classic", exact: true })
        .waitFor();
      await p.waitForLoadState("networkidle");
      runs.push({
        catalogMs: loaded,
        filterMs: Date.now() - started,
        categoriesRequests: requests.filter((x) => x === "/api/v1/categories")
          .length,
        productsRequests: requests.filter((x) => x === "/api/v1/products")
          .length,
      });
      await p.close();
    }
  } finally {
    await b.close();
  }
  console.log(
    JSON.stringify(
      {
        method:
          "Chrome headless, localhost Angular dev server, 3 fresh pages, initial catalog then one explicit filter; includes networkidle wait, not a production speed claim",
        runs,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
