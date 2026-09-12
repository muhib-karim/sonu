export const formatModelSize = (sizeMb: number | null | undefined): string => {
  if (!sizeMb || !Number.isFinite(sizeMb) || sizeMb <= 0) {
    return "Unknown size";
  }

  const isGb = sizeMb >= 1024;
  const value = isGb ? sizeMb / 1024 : sizeMb;
  // GB rounds at >=10, MB at >=100 (the two scales' natural display ceiling).
  const digits = (isGb ? value >= 10 : value >= 100) ? 0 : 1;
  const unit = isGb ? "GB" : "MB";
  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} ${unit}`;
};
