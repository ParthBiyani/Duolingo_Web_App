import { Skeleton } from "@/components/ui";

import { nodeOffset } from "./layout";
import { pathStrings } from "./strings";

const PLACEHOLDER_NODES = 7;

/** Loading state shaped like the real path: a banner and a zig-zag of grey coins. */
export function PathSkeleton() {
  return (
    <div
      role="status"
      aria-label={pathStrings.loading}
      className="mx-auto w-full max-w-[592px] pt-4 pb-16 [--zigzag:0.7] md:pt-6 md:[--zigzag:1]"
    >
      <Skeleton className="h-[88px] w-full rounded-banner" />
      <ul aria-hidden="true" className="flex flex-col items-center pt-12">
        {Array.from({ length: PLACEHOLDER_NODES }, (_, index) => (
          <li key={index} className="flex h-[88px] w-full items-center justify-center">
            <Skeleton
              className="h-[57px] w-[70px] rounded-[50%]"
              style={{
                transform: `translateX(calc(${nodeOffset(index, false)}px * var(--zigzag)))`,
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
