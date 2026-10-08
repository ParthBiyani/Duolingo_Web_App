import { IconBase, type IconProps } from "./IconBase";

// Each page is a filled shape with three text lines cut out (even-odd fill).
const line = (x: number, y: number, w: number) =>
  `M${x} ${y}H${x + w}A0.6 0.6 0 0 1 ${x + w} ${y + 1.2}H${x}A0.6 0.6 0 0 1 ${x} ${y}Z`;

const LEFT_PAGE =
  "M11.3 6.3C9.6 5 7.2 4.4 4.3 4.5C3.7 4.5 3.2 5 3.2 5.6V17.2C3.2 17.8 3.7 18.3 4.3 18.3C7.1 18.2 9.4 18.8 11.3 20Z" +
  line(5.4, 8.1, 3.9) +
  line(5.4, 10.8, 3.9) +
  line(5.4, 13.5, 3.9);
const RIGHT_PAGE =
  "M12.7 6.3C14.4 5 16.8 4.4 19.7 4.5C20.3 4.5 20.8 5 20.8 5.6V17.2C20.8 17.8 20.3 18.3 19.7 18.3C16.9 18.2 14.6 18.8 12.7 20Z" +
  line(14.7, 8.1, 3.9) +
  line(14.7, 10.8, 3.9) +
  line(14.7, 13.5, 3.9);

/** Open guidebook painted in the current text colour. */
export function Book(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d={LEFT_PAGE} fill="currentColor" fillRule="evenodd" />
      <path d={RIGHT_PAGE} fill="currentColor" fillRule="evenodd" />
    </IconBase>
  );
}
