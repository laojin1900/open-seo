import { t } from "@/client/features/laojin/i18n";
export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="space-y-2 p-4">
      <h1 className="text-2xl">404</h1>
      <div className="text-base-content/70">
        {children || <p>{t("The page you are looking for does not exist.")}</p>}
      </div>
    </div>
  );
}
