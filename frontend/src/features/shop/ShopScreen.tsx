"use client";

import { Gem, HeartRefill, HeartUnlimited, Snowflake } from "@/components/icons";
import { Mascot } from "@/components/mascot";
import { Button, Skeleton, toast } from "@/components/ui";
import { strings } from "@/content/strings";
import {
  isApiError,
  isUnexpectedError,
  usePurchase,
  useRefillHearts,
  useShop,
  type ShopItem,
} from "@/lib/api";

import { ShopItemRow } from "./ShopItemRow";
import { shopStrings } from "./strings";

const comingSoon = () => toast(strings.common.comingSoon, { id: "coming-soon" });

/** Explains a failed purchase; unexpected failures are already reported globally. */
function reportPurchaseError(error: unknown) {
  if (isUnexpectedError(error)) return;
  toast.error(
    isApiError(error, "insufficient_gems") ? shopStrings.notEnoughGems : shopStrings.purchaseFailed,
  );
}

/** Shop: a Super promo, heart refills and the Streak Freeze power-up, priced in gems. */
export function ShopScreen() {
  const shop = useShop();
  const refill = useRefillHearts();
  const purchase = usePurchase();

  if (shop.isPending) return <ShopSkeleton />;

  if (shop.isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Mascot pose="sad" size={140} />
        <h1 className="text-heading text-title">{shopStrings.loadErrorTitle}</h1>
        <p className="text-muted">{shopStrings.loadErrorBody}</p>
        <Button variant="secondary" loading={shop.isFetching} onClick={() => void shop.refetch()}>
          {shopStrings.retry}
        </Button>
      </div>
    );
  }

  const find = (key: ShopItem["key"]) => shop.data.items.find((item) => item.key === key);
  const refillItem = find("heart_refill");
  const unlimitedItem = find("unlimited_hearts");
  const freezeItem = find("streak_freeze");

  const buyRefill = () =>
    refill.mutate("shop", {
      onSuccess: () => toast.success(shopStrings.refillDone),
      onError: reportPurchaseError,
    });

  const buyFreeze = () =>
    purchase.mutate("streak_freeze", {
      onSuccess: () => toast.success(shopStrings.freezeDone),
      onError: reportPurchaseError,
    });

  return (
    <div className="pt-6 pb-16">
      <h1 className="sr-only">{shopStrings.pageTitle}</h1>

      <section className="flex items-center justify-between gap-4 overflow-hidden rounded-rail bg-linear-to-r from-purple to-blue p-6 text-white">
        <div className="min-w-0">
          <span className="rounded-lg bg-white/25 px-2 py-1 text-caps uppercase">
            {shopStrings.superBadge}
          </span>
          <h2 className="mt-3 text-heading">{shopStrings.superTitle}</h2>
          <p className="mt-2 max-w-sm">{shopStrings.superBody}</p>
          <Button variant="outline" className="mt-5" onClick={comingSoon}>
            {shopStrings.superCta}
          </Button>
        </div>
        <Mascot pose="celebrate" size={120} className="shrink-0 max-md:hidden" />
      </section>

      <section aria-labelledby="shop-hearts" className="mt-10">
        <h2 id="shop-hearts" className="pb-4 text-heading text-title">
          {shopStrings.hearts}
        </h2>
        <ul>
          {refillItem ? (
            <ShopItemRow
              icon={<HeartRefill size={80} />}
              name={refillItem.name}
              description={refillItem.description}
              action={
                refillItem.disabled_reason === "full" ? (
                  <Button variant="outline" disabled>
                    {shopStrings.full}
                  </Button>
                ) : (
                  <PriceButton item={refillItem} loading={refill.isPending} onClick={buyRefill} />
                )
              }
            />
          ) : null}
          {unlimitedItem ? (
            <ShopItemRow
              icon={<HeartUnlimited size={80} />}
              name={unlimitedItem.name}
              description={unlimitedItem.description}
              action={
                <Button variant="super" onClick={comingSoon}>
                  {shopStrings.freeTrial}
                </Button>
              }
            />
          ) : null}
        </ul>
      </section>

      {freezeItem ? (
        <section aria-labelledby="shop-power-ups" className="mt-10">
          <h2 id="shop-power-ups" className="pb-4 text-heading text-title">
            {shopStrings.powerUps}
          </h2>
          <ul>
            <ShopItemRow
              icon={<Snowflake size={64} />}
              name={freezeItem.name}
              badge={
                freezeItem.owned !== null && freezeItem.max_owned !== null ? (
                  <span className="rounded-full bg-feedback-correct-bg px-2.5 py-1 text-caps text-feedback-correct-text uppercase">
                    {shopStrings.equippedCount(freezeItem.owned, freezeItem.max_owned)}
                  </span>
                ) : null
              }
              description={freezeItem.description}
              action={
                freezeItem.disabled_reason === "max_owned" ? (
                  <Button variant="outline" disabled>
                    {shopStrings.equipped}
                  </Button>
                ) : (
                  <PriceButton item={freezeItem} loading={purchase.isPending} onClick={buyFreeze} />
                )
              }
            />
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Outlined "gem + price" button; disabled when the learner cannot afford the item. */
function PriceButton({
  item,
  loading,
  onClick,
}: {
  item: ShopItem;
  loading: boolean;
  onClick: () => void;
}) {
  const price = item.price_gems ?? 0;
  const unaffordable = item.disabled_reason === "insufficient_gems";
  return (
    <Button
      variant="outline"
      disabled={unaffordable}
      loading={loading}
      onClick={onClick}
      aria-label={shopStrings.buyLabel(item.name, price)}
      title={unaffordable ? shopStrings.notEnoughGems : undefined}
    >
      <Gem size={22} />
      {shopStrings.price(price)}
    </Button>
  );
}

function ShopSkeleton() {
  return (
    <div role="status" aria-label={shopStrings.loading} className="pt-6">
      <Skeleton className="h-44 w-full rounded-rail" />
      <Skeleton className="mt-10 h-7 w-32" />
      {[0, 1].map((index) => (
        <div key={index} className="mt-6 flex items-center gap-6">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-11 w-28 rounded-button" />
        </div>
      ))}
    </div>
  );
}
