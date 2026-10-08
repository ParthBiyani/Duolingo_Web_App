import { Mascot } from "@/components/mascot";
import { strings } from "@/content/strings";

/** Settings page that exists in the navigation but is not built yet. */
export function SettingsPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h1 className="text-heading text-title">{title}</h1>
      <div className="mt-8 flex flex-col items-center gap-3 rounded-rail border-2 border-border px-6 py-10 text-center">
        <Mascot pose="peek" size={120} />
        <p className="text-lead font-bold text-title">{strings.common.comingSoon}</p>
        <p className="max-w-sm text-muted">{body}</p>
      </div>
    </>
  );
}
