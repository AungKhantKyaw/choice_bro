# Fixtures

These HTML files are **hand-written approximations** built from the CSS selectors
the scrapers used, not captures of the live sites. They pin down the extraction
logic (price parsing, URL resolution, skipping incomplete cards) but cannot tell
you whether a retailer has changed its markup.

To make them real: open a search page in your browser, "Save page as > HTML only",
and replace the matching file here. If a test then fails, the selectors in
`../extractors.ts` need updating.
