import { useId, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

export const CalendarModuleIcon = ({ title = "Calendario", ...props }: IconProps) => {
  const gradientId = useId().replace(/:/g, "");
  const headerId = useId().replace(/:/g, "");
  return (
    <svg aria-hidden={title ? undefined : true} role="img" {...baseProps} {...props}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="20" y2="20">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id={headerId} x1="5" y1="4" x2="19" y2="8">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect x="4" y="5" width="16" height="15" rx="4" fill={`url(#${gradientId})`} opacity="0.16" />
      <rect x="4.75" y="7.25" width="14.5" height="12" rx="3" stroke={`url(#${gradientId})`} strokeWidth="1.6" />
      <path d="M8 4.5v3" stroke="#6366F1" strokeWidth="1.8" />
      <path d="M16 4.5v3" stroke="#EC4899" strokeWidth="1.8" />
      <rect x="5.25" y="7" width="13.5" height="3.3" rx="1.65" fill={`url(#${headerId})`} opacity="0.9" />
      <circle cx="9" cy="13" r="1.2" fill="#6366F1" />
      <circle cx="12.25" cy="13" r="1.2" fill="#22D3EE" />
      <circle cx="15.5" cy="13" r="1.2" fill="#F97316" />
      <circle cx="9" cy="16" r="1.2" fill="#10B981" />
      <circle cx="12.25" cy="16" r="1.2" fill="#8B5CF6" />
      <circle cx="15.5" cy="16" r="1.2" fill="#EC4899" />
    </svg>
  );
};

export const PersonModuleIcon = ({ title = "Mis eventos", ...props }: IconProps) => {
  const gradientId = useId().replace(/:/g, "");
  const accentId = useId().replace(/:/g, "");
  return (
    <svg aria-hidden={title ? undefined : true} role="img" {...baseProps} {...props}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="5" y1="4" x2="19" y2="20">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="55%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id={accentId} x1="7" y1="11" x2="17" y2="19">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="8.2" r="3.1" fill={`url(#${gradientId})`} opacity="0.2" />
      <circle cx="12" cy="8.2" r="2.65" stroke={`url(#${gradientId})`} strokeWidth="1.6" />
      <path
        d="M6.2 19a5.8 5.8 0 0 1 11.6 0"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.7"
        fill={`url(#${gradientId})`}
        opacity="0.18"
      />
      <path d="M8.2 17.5c1.15-1.55 2.43-2.25 3.8-2.25 1.37 0 2.65.7 3.8 2.25" stroke={`url(#${gradientId})`} strokeWidth="1.7" />
      <circle cx="17.2" cy="7.1" r="2.1" fill={`url(#${accentId})`} opacity="0.85" />
      <path d="M17.2 5.95v2.3M16.05 7.1h2.3" stroke="#fff" strokeWidth="1.3" />
    </svg>
  );
};

export const HourglassModuleIcon = ({
  title = "Cálculo de horas",
  ...props
}: IconProps) => {
  const gradientId = useId().replace(/:/g, "");
  const sandId = useId().replace(/:/g, "");
  return (
    <svg aria-hidden={title ? undefined : true} role="img" {...baseProps} {...props}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="6" y1="4" x2="18" y2="20">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="55%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
        <linearGradient id={sandId} x1="9" y1="9" x2="15" y2="17">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
      <path d="M8 4.75h8" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
      <path d="M8 19.25h8" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
      <path
        d="M8.7 5.6c0 2.55 1.7 3.95 3.3 5.05 1.6-1.1 3.3-2.5 3.3-5.05"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.8"
        fill={`url(#${gradientId})`}
        opacity="0.12"
      />
      <path
        d="M8.7 18.4c0-2.55 1.7-3.95 3.3-5.05 1.6 1.1 3.3 2.5 3.3 5.05"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.8"
        fill={`url(#${gradientId})`}
        opacity="0.12"
      />
      <path d="M10 9.6c.9.8 1.45 1.2 2 1.6.55-.4 1.1-.8 2-1.6" stroke={`url(#${gradientId})`} strokeWidth="1.7" />
      <path d="M10.25 15.2h3.5" stroke={`url(#${gradientId})`} strokeWidth="1.7" />
      <path d="M11 13.75c.36.45.65.68 1 .95.35-.27.64-.5 1-.95" stroke={`url(#${gradientId})`} strokeWidth="1.6" />
      <path d="M11.15 15.2c.42.75.63 1.05.85 1.4.22-.35.43-.65.85-1.4" stroke={`url(#${sandId})`} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.15" fill={`url(#${sandId})`} />
    </svg>
  );
};

export const TableModuleIcon = ({ title = "Tabla de control", ...props }: IconProps) => {
  const gradientId = useId().replace(/:/g, "");
  const accentId = useId().replace(/:/g, "");
  return (
    <svg aria-hidden={title ? undefined : true} role="img" {...baseProps} {...props}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="4" y1="5" x2="20" y2="19">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="55%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id={accentId} x1="6" y1="9" x2="18" y2="17">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
      </defs>
      <rect x="4.5" y="6" width="15" height="12" rx="3" stroke={`url(#${gradientId})`} strokeWidth="1.7" fill={`url(#${gradientId})`} opacity="0.12" />
      <path d="M4.8 10.1h14.4" stroke={`url(#${gradientId})`} strokeWidth="1.6" />
      <path d="M10.25 6.35v11.3" stroke={`url(#${gradientId})`} strokeWidth="1.6" />
      <path d="M15.7 6.35v11.3" stroke={`url(#${gradientId})`} strokeWidth="1.6" opacity="0.7" />
      <rect x="6" y="11.3" width="3.2" height="2.6" rx="0.8" fill={`url(#${accentId})`} />
      <rect x="11.7" y="11.3" width="6.1" height="2.6" rx="0.8" fill="#60A5FA" opacity="0.85" />
      <rect x="6" y="14.6" width="11.8" height="2.6" rx="0.8" fill="#A78BFA" opacity="0.8" />
    </svg>
  );
};
