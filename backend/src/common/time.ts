export const TIME_ZONE = "Asia/Ho_Chi_Minh";
export const dateKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
export const timeKey = () =>
  new Date().toLocaleTimeString("vi-VN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  );
}
