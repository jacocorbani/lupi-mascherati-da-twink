const { createRequire } = require("node:module");
const { mkdir, writeFile } = require("node:fs/promises");
const cli = createRequire(require.resolve("firebase-tools/package.json"));
const auth = cli("./lib/auth");
const { Client } = cli("./lib/apiv2");
(async () => {
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error("Accesso richiesto");
  auth.setActiveAccount({}, account);
  const project = "lupimacheratidatwink",
    results = {};
  for (const [name, origin, path] of [
    [
      "auth",
      "https://identitytoolkit.googleapis.com",
      `/admin/v2/projects/${project}/config`,
    ],
    [
      "billing",
      "https://cloudbilling.googleapis.com",
      `/v1/projects/${project}/billingInfo`,
    ],
    [
      "buckets",
      "https://storage.googleapis.com",
      `/storage/v1/b?project=${project}`,
    ],
  ]) {
    try {
      const r = await new Client({ urlPrefix: origin }).get(path);
      const b = r.body;
      results[name] =
        name === "auth"
          ? {
              signIn: b.signIn,
              client: b.client,
              authorizedDomains: b.authorizedDomains,
              passwordPolicyConfig: b.passwordPolicyConfig,
            }
          : name === "billing"
            ? { billingEnabled: b.billingEnabled }
            : {
                buckets:
                  b.items?.map((x) => ({
                    name: x.name,
                    location: x.location,
                  })) || [],
              };
    } catch (e) {
      results[name] = { error: e.message };
    }
  }
  await mkdir("reports/private", { recursive: true });
  await writeFile(
    "reports/private/services.json",
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
