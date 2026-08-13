import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/client/features/laojin/i18n";

const DATAFORSEO_API_ACCESS_URL = "https://app.dataforseo.com/api-access";

export const Route = createFileRoute("/_app/help/dataforseo-api-key")({
  component: DataforseoApiKeyHelpPage,
});

function DataforseoApiKeyHelpPage() {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8 overflow-auto">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-3">
            <h1 className="text-2xl font-semibold">
              {t("Set up your DataForSEO API key")}</h1>
            <p className="text-sm text-base-content/70">
              {t("OpenSEO needs the")}<code>{t("DATAFORSEO_API_KEY")}</code> {t("secret before\n              keyword, domain, and SEO data workflows can run.")}</p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">{t("Steps")}</h2>
            <ol className="list-decimal pl-5 text-sm space-y-3 text-base-content/80">
              <li>
                {t("Go to")}{" "}
                <a
                  className="link link-primary"
                  href={DATAFORSEO_API_ACCESS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("DataForSEO API Access")}</a>{" "}
                {t("and request API credentials by email.")}</li>
              <li>
                {t("Base64 encode your DataForSEO login and API password in this\n                format:")}<pre className="mt-2 p-3 rounded bg-base-200 border border-base-300 overflow-x-auto text-xs">
                  <code>{t("printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64")}</code>
                </pre>
              </li>
              <li>
                {t("Save the output as the")}<code>{t("DATAFORSEO_API_KEY")}</code> secret in
                your environment.
              </li>
            </ol>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-2 text-sm text-base-content/75">
            <h2 className="card-title text-base">
              {t("Cloudflare Workers (Dashboard UI)")}</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-base-content/80">
              <li>
                {t("In Cloudflare, go to")}<code>{t("Compute")}</code> -&gt;{" "}
                <code>{t("Workers &amp; Pages")}</code>
                {t("and open your OpenSEO Worker.")}</li>
              <li>
                {t("Open")}<code>{t("Settings")}</code>.
              </li>
              <li>
                {t("Go to")}<code>{t("Variables &amp; Secrets")}</code> and add a new secret
                named
                <code className="mx-1">{t("DATAFORSEO_API_KEY")}</code>.
              </li>
              <li>
                {t("Paste the base64 value from the terminal command above and save.")}</li>
            </ol>

            <div className="divider my-1" />

            <p>{t("Or set the same secret from your terminal with:")}</p>
            <pre className="p-3 rounded bg-base-200 border border-base-300 overflow-x-auto text-xs">
              <code>{t("npx wrangler secret put DATAFORSEO_API_KEY")}</code>
            </pre>
            <p>
              {t("Use the base64 value of")}<code>login:password</code> when prompted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
