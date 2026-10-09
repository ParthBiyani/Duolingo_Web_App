import { SettingsPlaceholder } from "@/features/settings/SettingsPlaceholder";
import { settingsStrings } from "@/features/settings/strings";

export default function NotificationsSettingsPage() {
  const { title, body } = settingsStrings.placeholders.notifications;
  return <SettingsPlaceholder title={title} body={body} />;
}
