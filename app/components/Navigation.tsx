import { TAB_LABELS } from "../constants";
import type { AppTab } from "../constants";

interface NavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  processComplete: boolean;
}

export function Navigation({ activeTab, onTabChange, processComplete }: NavigationProps) {
  if (!processComplete) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as AppTab[]).map((tabKey) => {
          const selected = activeTab === tabKey;

          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => onTabChange(tabKey)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                selected
                  ? "border-lime-300 bg-lime-300/20"
                  : "border-emerald-800 hover:border-lime-500"
              }`}
            >
              {TAB_LABELS[tabKey]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
