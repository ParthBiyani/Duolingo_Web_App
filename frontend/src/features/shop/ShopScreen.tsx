"use client";

import { useSyncExternalStore } from "react";

import { DuoImage, Gem, HeartRefill, HeartUnlimited, Snowflake } from "@/components/icons";
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

/** The family-plan banner's soft green, blue and pink glow over its navy base. */
const FAMILY_PLAN_GLOW =
  "radial-gradient(216% 106% at 6% 3%, rgb(38 246 99 / 0.3) 0, rgb(38 138 255 / 0.3) 52%, rgb(252 85 255 / 0.3) 100%)";

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

      <PromoBanner />

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
                <Button variant="outline" className="text-magenta" onClick={comingSoon}>
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
      <span className="text-blue">{shopStrings.getFor}</span>
      <Gem size={20} />
      <span className="text-blue">{shopStrings.price(price)}</span>
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

/** One roll per page load decides which offer the top banner shows, like the original's rotation. */
const promoRoll = Math.random();
const noSubscription = () => () => {};

/**
 * The top banner: the family plan or the Super free trial. The server always renders the family
 * plan so hydration matches; the client then shows its pick. Both offers are "Coming soon".
 */
function PromoBanner() {
  const superTrial = useSyncExternalStore(
    noSubscription,
    () => promoRoll < 0.5,
    () => false,
  );
  return superTrial ? <SuperTrialBanner /> : <FamilyPlanBanner />;
}

function FamilyPlanBanner() {
  return (
    <section
      className="relative min-h-[197px] overflow-hidden rounded-rail bg-family-plan px-5 pt-11 pb-6 text-white"
      style={{ backgroundImage: FAMILY_PLAN_GLOW }}
    >
      <DuoImage
        name="family-plan"
        size={494}
        className="pointer-events-none absolute top-[3px] left-[392px] max-md:hidden"
      />
      <div className="relative max-w-[370px]">
        <h2 className="text-[25px] leading-[34px] font-bold">{shopStrings.familyTitle}</h2>
        <p className="leading-[25px] md:whitespace-nowrap">
          {shopStrings.familyBodyBefore}
          <strong>{shopStrings.familyBodyBrand}</strong>
          {shopStrings.familyBodyAfter}
        </p>
        <button
          type="button"
          onClick={comingSoon}
          className="mt-[22px] h-[50px] w-full rounded-button border-b-4 border-family-plan/25 bg-white text-button text-family-plan uppercase transition-[translate] duration-100 active:translate-y-0.5 active:border-b-2"
        >
          {shopStrings.familyCta}
        </button>
      </div>
    </section>
  );
}

/** The Super trial offer: the owl and SUPER badge appear once the banner is wide enough. */
function SuperTrialBanner() {
  return (
    <section
      className="@container relative overflow-hidden rounded-rail bg-family-plan p-5 text-white"
      style={{ backgroundImage: FAMILY_PLAN_GLOW }}
    >
      <DuoImage
        name="super-badge"
        size={87}
        className="absolute top-4 right-4 hidden @min-[40rem]:block"
      />
      <div className="flex items-center gap-[46px]">
        <DuoImage name="super-trial-owl" size={93} className="hidden shrink-0 @min-[40rem]:block" />
        <h2 className="mt-6 max-w-[369px] text-[25px] leading-[34px] font-bold @min-[40rem]:mt-0 @min-[40rem]:max-w-[440px]">
          {shopStrings.superTrialTitle}
        </h2>
      </div>
      <button
        type="button"
        onClick={comingSoon}
        className="mt-6 h-[50px] w-full rounded-button border-b-4 border-white/50 bg-white text-button text-family-plan uppercase transition-[translate] duration-100 active:translate-y-0.5 active:border-b-2"
      >
        {shopStrings.superTrialCta}
      </button>
    </section>
  );
}
