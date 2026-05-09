import type { CSSProperties, ReactNode } from "react";

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

const make = (children: ReactNode, vb = "0 0 24 24") =>
  function IconComponent({ size = 22, color = "currentColor", strokeWidth = 1.6, style }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={vb}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, ...style }}
      >
        {children}
      </svg>
    );
  };

export const Icon = {
  home: make(
    <>
      <path d="M3.5 11 12 3.5l8.5 7.5" />
      <path d="M5.5 9.8V20a.5.5 0 0 0 .5.5h4V14h4v6.5h4a.5.5 0 0 0 .5-.5V9.8" />
    </>,
  ),
  plus: make(<path d="M12 5v14M5 12h14" />),
  sparkle: make(
    <>
      <path d="M12 3.5l1.6 4.6 4.6 1.6-4.6 1.6L12 16l-1.6-4.7-4.6-1.6 4.6-1.6L12 3.5z" />
      <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" strokeWidth={1.2} />
    </>,
  ),
  body: make(
    <>
      <circle cx="12" cy="4.6" r="2.1" />
      <path d="M8.5 9c-.7 1.6-1 3.2-1 4.5l-1 5.5h2.4l.6-4.6h.5l.4 5.6h3.2l.4-5.6h.5l.6 4.6h2.4l-1-5.5c0-1.3-.3-2.9-1-4.5l-.7-1.4H9.2L8.5 9z" />
    </>,
  ),
  chart: make(
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 15l3.2-4.2 3 2.6L18 7" />
      <circle cx="18" cy="7" r="1.4" fill="currentColor" />
    </>,
  ),
  cloud: make(<path d="M7 17.5h10.2A3.8 3.8 0 0 0 18 10a5 5 0 0 0-9.6-1.4A3.8 3.8 0 0 0 7 17.5z" />),
  pill: make(
    <>
      <rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-25 12 12)" />
      <path d="M11.2 7.4l5.4 9.3" transform="rotate(-25 12 12)" />
    </>,
  ),
  file: make(
    <>
      <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10A1.5 1.5 0 0 0 18.5 19V8L14 3.5z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M8.5 13h7M8.5 16h5" />
    </>,
  ),
  mic: make(
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v2.5" />
    </>,
  ),
  camera: make(
    <>
      <path d="M4 8.5h3l1.4-2h7.2L17 8.5h3v10H4v-10z" />
      <circle cx="12" cy="13" r="3.4" />
    </>,
  ),
  bowl: make(
    <>
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z" />
      <path d="M9 8.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5" />
    </>,
  ),
  moon: make(<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z" />),
  bolt: make(<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z" />),
  run: make(
    <>
      <circle cx="14.5" cy="4.5" r="1.8" />
      <path d="M5 13l3-1.5 2.5 1L9 15l1.5 2 .5 4" />
      <path d="M11 15l3 1 1.5 4M14 9.5l2 2.5 3 .5" />
    </>,
  ),
  smile: make(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 14.5a3.6 3.6 0 0 0 6 0" />
      <circle cx="9" cy="10" r=".8" fill="currentColor" />
      <circle cx="15" cy="10" r=".8" fill="currentColor" />
    </>,
  ),
  chev: make(<path d="M9 6l6 6-6 6" />),
  chevDown: make(<path d="M6 9l6 6 6-6" />),
  close: make(<path d="M6 6l12 12M18 6 6 18" />),
  check: make(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  flame: make(
    <path d="M12 3.5c2 3 5 4.5 5 8.5a5 5 0 1 1-10 0c0-2 1-2.5 1-4.5 1.5 0 2 1 2 2 0-2 1-3.5 2-6z" />,
  ),
  info: make(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v6M12 8.2v.1" />
    </>,
  ),
  bell: make(
    <>
      <path d="M6 16.5c.8-1 1-2 1-4V11a5 5 0 0 1 10 0v1.5c0 2 .2 3 1 4H6z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>,
  ),
  settings: make(
    <>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M19 12.8v-1.6l1.5-1-1.4-2.5-1.7.5-1.4-1L15.6 5h-3l-.4 1.7-1.5 1-1.6-.5L7.7 9.7l1.5 1.1v1.6l-1.5 1.1 1.4 2.5 1.7-.5 1.4 1 .4 1.7h3l.4-1.7 1.5-1 1.6.5 1.5-2.5-1.5-1z" />
    </>,
  ),
  droplet: make(<path d="M12 3.5c4 4.5 6 7.5 6 10.5a6 6 0 1 1-12 0c0-3 2-6 6-10.5z" />),
  pulse: make(<path d="M3.5 12h4l2-5 4 10 2-5h5" />),
  leaf: make(
    <>
      <path d="M5 18s1.5-9 9-13c2 6 0 12-4 14a4.5 4.5 0 0 1-5-1z" />
      <path d="M5 19c2-3 4-5 7-7" />
    </>,
  ),
  arrowRight: make(<path d="M5 12h14M14 6l6 6-6 6" />),
  arrowUp: make(<path d="M12 19V5M6 11l6-6 6 6" />),
  arrowDown: make(<path d="M12 5v14M6 13l6 6 6-6" />),
  download: make(
    <>
      <path d="M12 4v12M6 11l6 6 6-6" />
      <path d="M4 20.5h16" />
    </>,
  ),
  share: make(
    <>
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8 11l8-4M8 13l8 4" />
    </>,
  ),
  rotate: make(
    <>
      <path d="M4 11a8 8 0 0 1 14-4l1.5 1.5" />
      <path d="M19 4v4h-4" />
      <path d="M20 13a8 8 0 0 1-14 4L4.5 15.5" />
      <path d="M5 20v-4h4" />
    </>,
  ),
};

export type IconName = keyof typeof Icon;
