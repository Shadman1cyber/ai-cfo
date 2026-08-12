export function formatNumber(num: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.abs(num));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getTypeLabel(type: "INCOME" | "EXPENSE"): string {
  return type === "INCOME" ? "درآمد" : "هزینه";
}

export function getTypeColor(type: "INCOME" | "EXPENSE"): string {
  return type === "INCOME" ? "text-success" : "text-danger";
}

export function getTypeBg(type: "INCOME" | "EXPENSE"): string {
  return type === "INCOME" ? "bg-success/10" : "bg-danger/10";
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}