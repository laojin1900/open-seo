import { createFileRoute } from "@tanstack/react-router";
import { t } from "@/client/features/laojin/i18n";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/settings/keys";

export const Route = createFileRoute("/_app/help/openrouter-api-key")({
  component: OpenrouterApiKeyHelpPage,
});

function OpenrouterApiKeyHelpPage() {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6 pb-24 md:pb-8 overflow-auto">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-3">
            <h1 className="text-2xl font-semibold">
              {t("Set up your OpenRouter API key")}</h1>
            <p className="text-sm text-base-content/70">
              {t("OpenSEO needs the")}<code>{t("OPENROUTER_API_KEY")}</code> secret before AI
              features like SAM, the in-app SEO agent, can run. It is optional —
              everything else in OpenSEO works without it.
            </p>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">{t("Steps")}</h2>
            <ol className="list-decimal pl-5 text-sm space-y-3 text-base-content/80">
              <li>
                {t("Create an account at")}{" "}
                <a
                  className="link link-primary"
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noreferrer"
                >
                  openrouter.ai
                </a>{" "}
                {t("and add credits (pay-as-you-go, like DataForSEO).")}</li>
              <li>
                {t("Go to")}{" "}
                <a
                  className="link link-primary"
                  href={OPENROUTER_KEYS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("OpenRouter API Keys")}</a>{" "}
                {t("and click \"Create API Key\".")}</li>
              <li>
                {t("Save the key as the")}<code>{t("OPENROUTER_API_KEY")}</code> secret in
                your environment:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>
                    {t("Docker self-hosting:")}<code>.env</code>
                  </li>
                  <li>{t("Cloudflare: set it in the Workers UI (see below)")}</li>
                  <li>
                    {t("Local development:")}<code>.env.local</code>
                  </li>
                </ul>
              </li>
              <li>{t("Restart OpenSEO.")}</li>
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
                <code className="mx-1">{t("OPENROUTER_API_KEY")}</code>.
              </li>
              <li>{t("Paste your OpenRouter API key and save.")}</li>
            </ol>

            <div className="divider my-1" />

            <p>{t("Or set the same secret from your terminal with:")}</p>
            <pre className="p-3 rounded bg-base-200 border border-base-300 overflow-x-auto text-xs">
              <code>{t("npx wrangler secret put OPENROUTER_API_KEY")}</code>
            </pre>
            <p>{t("Paste your OpenRouter API key when prompted.")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
