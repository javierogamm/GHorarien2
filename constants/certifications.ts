export const CERTIFICATION_OPTIONS = ["CAAG", "CAZ", "GFD", "OTROS"] as const;

export type CertificationOption = (typeof CERTIFICATION_OPTIONS)[number];

export const CERTIFICATION_LABELS: Record<CertificationOption, string> = {
  CAAG: "CAAG",
  CAZ: "CAZ",
  GFD: "GFD",
  OTROS: "OTROS"
};

export const normalizeCertification = (value?: string | null): CertificationOption | "" =>
  value && CERTIFICATION_OPTIONS.includes(value as CertificationOption)
    ? (value as CertificationOption)
    : "";
