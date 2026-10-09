import { SettingsPlaceholder } from "@/features/settings/SettingsPlaceholder";
import { settingsStrings } from "@/features/settings/strings";

export default function ProfileSettingsPage() {
  const { title, body } = settingsStrings.placeholders.profile;
  return <SettingsPlaceholder title={title} body={body} />;
}
