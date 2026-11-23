const formatDate = (date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));

export function formatRange(range) {
  if (!range) return "All dates";
  const start = formatDate(range.start);
  const end = formatDate(range.end);
  if (range.start === range.end) return start;
  if (range.start.slice(0, 4) === range.end.slice(0, 4)) {
    const shortStart = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${range.start}T12:00:00`));
    return `${shortStart} – ${end}`;
  }
  return `${start} – ${end}`;
}
