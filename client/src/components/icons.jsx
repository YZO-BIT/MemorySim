const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ size = 17, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...base}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconArchive = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="4.5" rx="1.2" />
    <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5" />
    <path d="M10 12.5h4" />
  </Svg>
);

export const IconCompare = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="7.5" height="16" rx="1.2" />
    <rect x="13.5" y="4" width="7.5" height="16" rx="1.2" />
    <path d="M12 4v16" strokeDasharray="2 2.6" />
  </Svg>
);

export const IconChevron = (p) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);

export const IconChevronRight = (p) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconPlay = (p) => (
  <Svg {...p}>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconPause = (p) => (
  <Svg {...p}>
    <path d="M8 5.5v13M16 5.5v13" strokeWidth="2.4" />
  </Svg>
);

export const IconPrev = (p) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" strokeWidth="2.2" />
  </Svg>
);

export const IconNext = (p) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" strokeWidth="2.2" />
  </Svg>
);

export const IconReset = (p) => (
  <Svg {...p}>
    <path d="M4 5v5h5" />
    <path d="M4.6 10a8 8 0 1 1 1.4 7.5" />
  </Svg>
);

export const IconCpu = (p) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1.6" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="0.8" />
    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </Svg>
);

export const IconLayers = (p) => (
  <Svg {...p}>
    <path d="M12 3l9 5-9 5-9-5z" />
    <path d="M3 13l9 5 9-5" />
  </Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" strokeWidth="2.1" />
  </Svg>
);

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 4L2.5 20h19z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </Svg>
);

export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.6v.1" />
  </Svg>
);

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);

export const IconTarget = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconList = (p) => (
  <Svg {...p}>
    <path d="M8.5 6h12M8.5 12h12M8.5 18h12M4 6h.1M4 12h.1M4 18h.1" />
  </Svg>
);

export const IconTable = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.4" />
    <path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15" />
  </Svg>
);

export const IconDatabase = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="5.5" rx="8" ry="2.8" />
    <path d="M4 5.5v13c0 1.55 3.58 2.8 8 2.8s8-1.25 8-2.8v-13" />
    <path d="M4 12c0 1.55 3.58 2.8 8 2.8s8-1.25 8-2.8" />
  </Svg>
);

export const IconSwap = (p) => (
  <Svg {...p}>
    <path d="M4 7h13l-3-3M20 17H7l3 3" />
  </Svg>
);
