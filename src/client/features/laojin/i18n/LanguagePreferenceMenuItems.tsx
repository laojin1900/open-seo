// 老金定制：用户菜单语言切换（仿 ThemePreferenceMenuItems，挂 Sidebar 用户菜单）
import { Languages } from "lucide-react";
import { useT, setUiLanguage, t as t_menu } from "@/client/features/laojin/i18n";

const LANGUAGE_OPTIONS = [
  { value: "en" as const, label: "English" },
  { value: "zh" as const, label: "中文" },
];

export function LanguagePreferenceMenuItems() {
  const { lang } = useT();

  return (
    <>
      <li className="menu-title pt-2">
        <span>{t_menu("pref.language")}</span>
      </li>

      <li>
        <div role="radiogroup" aria-label="UI language" className="flex gap-1 rounded-lg bg-base-200 p-1">
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.value === lang;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-base-100 text-base-content shadow-sm"
                    : "text-base-content/50 hover:text-base-content/80"
                }`}
                onClick={() => setUiLanguage(option.value)}
              >
                {option.value === "en" ? (
                  <>
                    <Languages className="size-3.5" />
                    <span>EN</span>
                  </>
                ) : (
                  <span>中文</span>
                )}
              </button>
            );
          })}
        </div>
      </li>
    </>
  );
}
