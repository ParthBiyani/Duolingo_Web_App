import { redirect } from "next/navigation";

/** /settings has no page of its own; Preferences is the default section. */
export default function SettingsIndexPage() {
  redirect("/settings/preferences");
}
