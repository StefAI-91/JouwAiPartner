export function formatWeekRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = s.toLocaleDateString("nl-NL", { month: "short" });
  const eMonth = e.toLocaleDateString("nl-NL", { month: "short" });
  if (sMonth === eMonth) {
    return `${sDay} \u2013 ${eDay} ${eMonth}`;
  }
  return `${sDay} ${sMonth} \u2013 ${eDay} ${eMonth}`;
}

export function getWeekNumber(dateStr: string) {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}
