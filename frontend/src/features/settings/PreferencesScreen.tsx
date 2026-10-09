"use client";

import { useId } from "react";

import { Mascot } from "@/components/mascot";
import { Button, Select, Skeleton, toast, Toggle } from "@/components/ui";
import {
  isUnexpectedError,
  useMe,
  useUpdateSettings,
  type DailyGoal,
  type Settings,
  type SettingsUpdate,
  type Theme,
} from "@/lib/api";
import { DemoTools } from "@/features/demo/DemoTools";

import { SettingsSection } from "./SettingsLayout";
import { settingsStrings } from "./strings";

type BooleanSetting = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

const TOGGLES: { key: BooleanSetting; label: string }[] = [
  { key: "sound_effects", label: settingsStrings.preferences.soundEffects },
  { key: "animations", label: settingsStrings.preferences.animations },
  { key: "motivational_messages", label: settingsStrings.preferences.motivationalMessages },
  { key: "listening_exercises", label: settingsStrings.preferences.listeningExercises },
];

const THEME_OPTIONS = settingsStrings.themeOptions.map(({ value, label }) => ({ value, label }));
const GOAL_OPTIONS = settingsStrings.goalOptions.map(({ value, label }) => ({
  value: String(value),
  label,
}));

/**
 * Preferences: lesson toggles, theme and daily goal. Every change is saved straight away; the
 * mutation updates the cached learner first (optimistic), so the switch, the theme and the
 * daily-goal card react instantly and roll back if the server refuses.
 */
export function PreferencesScreen() {
  const me = useMe();
  const update = useUpdateSettings();

  const save = (change: SettingsUpdate) =>
    update.mutate(change, {
      onSuccess: () => toast.success(settingsStrings.saved, { id: "settings-saved" }),
      onError: (error) => {
        if (!isUnexpectedError(error)) toast.error(settingsStrings.saveFailed);
      },
    });

  return (
    <>
      <h1 className="text-heading text-title">{settingsStrings.preferences.title}</h1>

      {me.isPending ? (
        <PreferencesSkeleton />
      ) : me.isError ? (
        <div role="alert" className="mt-8 flex flex-col items-center gap-4 text-center">
          <Mascot pose="sad" size={120} />
          <p className="text-lead font-bold text-title">{settingsStrings.loadErrorTitle}</p>
          <p className="text-muted">{settingsStrings.loadErrorBody}</p>
          <Button variant="secondary" loading={me.isFetching} onClick={() => void me.refetch()}>
            {settingsStrings.retry}
          </Button>
        </div>
      ) : (
        <>
          <SettingsSection title={settingsStrings.preferences.lessonExperience}>
            {TOGGLES.map(({ key, label }) => (
              <ToggleRow
                key={key}
                label={label}
                checked={me.data.settings[key]}
                onChange={(value) => save({ [key]: value })}
              />
            ))}
          </SettingsSection>

          <SettingsSection title={settingsStrings.preferences.appearance}>
            <SelectRow
              label={settingsStrings.preferences.darkMode}
              value={me.data.settings.theme}
              options={THEME_OPTIONS}
              onChange={(value) => save({ theme: value as Theme })}
            />
          </SettingsSection>

          <SettingsSection title={settingsStrings.preferences.learning}>
            <SelectRow
              label={settingsStrings.preferences.dailyGoal}
              value={String(me.data.settings.daily_goal_xp)}
              options={GOAL_OPTIONS}
              onChange={(value) => save({ daily_goal_xp: Number(value) as DailyGoal })}
            />
          </SettingsSection>
        </>
      )}

      <DemoTools />
    </>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <label htmlFor={id} className="cursor-pointer font-bold text-body">
        {label}
      </label>
      <Toggle id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5">
      <label htmlFor={id} className="font-bold text-body">
        {label}
      </label>
      <Select
        id={id}
        value={value}
        options={options}
        onValueChange={onChange}
        className="w-full sm:w-48"
      />
    </div>
  );
}

function PreferencesSkeleton() {
  return (
    <div role="status" aria-label={settingsStrings.preferences.loading}>
      {[4, 1, 1].map((rows, index) => (
        <div key={index} className="mt-8">
          <Skeleton className="h-6 w-44" />
          <div className="mt-3 space-y-px rounded-rail border-2 border-border">
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex items-center justify-between px-4 py-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-8 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
