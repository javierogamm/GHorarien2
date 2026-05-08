export const CERTIFICATION_OPTIONS = ["CAAG", "CAZ", "GFD", "UPDATE", "ONBOARDING", "OTROS"] as const;

export type CertificationOption = (typeof CERTIFICATION_OPTIONS)[number];

export const CERTIFICATION_LABELS: Record<CertificationOption, string> = {
  CAAG: "CAAG",
  CAZ: "CAZ",
  GFD: "GFD",
  UPDATE: "UPDATE",
  ONBOARDING: "ONBOARDING",
  OTROS: "Otros"
};

export const normalizeCertification = (value?: string | null): CertificationOption | "" => {
  const normalizedValue = value?.trim().toUpperCase();
  return normalizedValue && CERTIFICATION_OPTIONS.includes(normalizedValue as CertificationOption)
    ? (normalizedValue as CertificationOption)
    : "";
};
