/** Horizontal rule with the next unit's title, separating two units on the path. */
export function UnitDivider({ title }: { title: string }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-4 pt-10 pb-2">
      <span className="h-0.5 flex-1 rounded-full bg-border" />
      <span className="max-w-[70%] text-center text-[17px] leading-6 font-bold text-muted">
        {title}
      </span>
      <span className="h-0.5 flex-1 rounded-full bg-border" />
    </div>
  );
}
