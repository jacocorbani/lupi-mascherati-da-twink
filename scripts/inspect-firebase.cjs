// Read-only inspection through the official Firebase MCP server. No tokens are printed.
const { createRequire } = require("node:module");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");
const cliRequire = createRequire(
  require.resolve("firebase-tools/package.json"),
);
const { Client } = cliRequire("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = cliRequire(
  "@modelcontextprotocol/sdk/client/stdio.js",
);
(async () => {
  const dir = path.resolve("reports/private/firebase-inspect");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, ".firebaserc"),
    JSON.stringify({ projects: { default: "lupimacheratidatwink" } }),
  );
  await writeFile(path.join(dir, "firebase.json"), "{}");
  const client = new Client({
    name: "combriccola-readonly-audit",
    version: "1.0.0",
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      require.resolve("firebase-tools/lib/bin/firebase.js"),
      "mcp",
      "--dir",
      dir,
    ],
    stderr: "pipe",
  });
  await client.connect(transport);
  try {
    const tools = (await client.listTools()).tools;
    await writeFile(
      path.join(dir, "tools.json"),
      JSON.stringify(tools, null, 2),
    );
    console.log(
      JSON.stringify(
        tools.map((t) => ({ name: t.name, inputSchema: t.inputSchema })),
        null,
        2,
      ),
    );
    for (const [name, args] of [
      ["firebase_get_project", {}],
      ["firebase_get_security_rules", { type: "firestore" }],
      ["firebase_get_security_rules", { type: "storage" }],
      ["firestore_list_collections", {}],
    ]) {
      if (!tools.find((t) => t.name === name)) continue;
      const result = await client.callTool({ name, arguments: args });
      await writeFile(
        path.join(dir, `${name}-${args.type || "result"}.json`),
        JSON.stringify(result, null, 2),
      );
      console.log(name, JSON.stringify(result));
    }
  } finally {
    await client.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
