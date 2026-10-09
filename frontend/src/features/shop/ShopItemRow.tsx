import type { ReactNode } from "react";

/**
 * One product in the shop: artwork, name with an optional badge, description and the action.
 * On narrow screens the action drops below the text so the description keeps its width.
 */
export function ShopItemRow({
  icon,
  name,
  badge,
  description,
  action,
}: {
  icon: ReactNode;
  name: string;
  badge?: ReactNode;
  description: string;
  action: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 border-t-2 border-border py-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-6">
      <div className="grid size-16 place-items-center md:size-20">{icon}</div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lead font-bold text-title">{name}</h3>
          {badge}
        </div>
        <p className="mt-1 text-muted dark:text-body">{description}</p>
      </div>
      <div className="col-span-2 flex justify-end md:col-span-1">{action}</div>
    </li>
  );
}
