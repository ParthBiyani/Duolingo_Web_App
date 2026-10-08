import { SettingsPlaceholder } from "@/features/settings/SettingsPlaceholder";
import { settingsStrings } from "@/features/settings/strings";

export default function PrivacySettingsPage() {
  const { title, body } = settingsStrings.placeholders.privacy;
  return <SettingsPlaceholder title={title} body={body} />;
}
