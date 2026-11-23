import { useState } from "react";
import { endOfMonth, getLocalTimeZone, parseDate, startOfMonth, today } from "@internationalized/date";
import { Calendar as CalendarIcon } from "@untitledui/icons";
import { DateRangePicker as AriaDateRangePicker, Dialog, Group, Popover } from "react-aria-components";
import { Button } from "../base/buttons/button";
import { InputDateBase } from "../base/input/input-date";
import { RangeCalendar } from "../application/date-picker/range-calendar";
import { formatRange } from "./dateRange.js";

const toCalendarRange = (range) => range ? { start: parseDate(range.start), end: parseDate(range.end) } : null;

export default function ExpenseDateRangeFilter({ value, onChange, placeholder = "All dates", className = "" }) {
  const [draft, setDraft] = useState(() => toCalendarRange(value));
  const [focusedValue, setFocusedValue] = useState(null);
  const [activePreset, setActivePreset] = useState("Custom range");
  const currentDay = today(getLocalTimeZone());
  const previousMonth = currentDay.subtract({ months: 1 });
  const presets = [
    { label: "Today", range: { start: currentDay, end: currentDay } },
    { label: "Last 7 days", range: { start: currentDay.subtract({ days: 6 }), end: currentDay } },
    { label: "Last 30 days", range: { start: currentDay.subtract({ days: 29 }), end: currentDay } },
    { label: "This month", range: { start: startOfMonth(currentDay), end: endOfMonth(currentDay) } },
    { label: "Last month", range: { start: startOfMonth(previousMonth), end: endOfMonth(previousMonth) } },
    { label: "Last 3 months", range: { start: startOfMonth(currentDay.subtract({ months: 2 })), end: endOfMonth(currentDay) } },
    { label: "This year", range: { start: currentDay.set({ month: 1, day: 1 }), end: currentDay.set({ month: 12, day: 31 }) } },
  ];

  const cancel = (close) => {
    setDraft(toCalendarRange(value));
    close();
  };

  const apply = (close) => {
    if (!draft?.start || !draft?.end) return;
    onChange({ start: draft.start.toString(), end: draft.end.toString() });
    close();
  };

  return (
    <AriaDateRangePicker
      aria-label="Filter expenses by date"
      value={draft}
      onChange={(range) => { setDraft(range); setActivePreset("Custom range"); }}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setDraft(toCalendarRange(value));
          setActivePreset("Custom range");
        }
      }}
      shouldCloseOnSelect={false}
      className={`expense-range-picker ${className}`.trim()}
    >
      <Group>
        <Button size="sm" color="secondary" iconLeading={CalendarIcon} className={`expense-range-trigger${value ? " is-active" : ""}`}>
          {value ? formatRange(value) : placeholder}
        </Button>
      </Group>
      <Popover placement="bottom end" shouldFlip={false} offset={8} className="expense-range-popover">
        <Dialog aria-label="Choose expense date range" className="expense-range-dialog">
          {({ close }) => (
            <>
              <div className="expense-range-main">
                <aside className="expense-quick-ranges" aria-label="Quick date ranges">
                  <span className="expense-quick-title">QUICK RANGES</span>
                  {presets.map((preset) => (
                    <Button key={preset.label} size="sm" color="tertiary" className={`expense-quick-range${activePreset === preset.label ? " is-active" : ""}`} onClick={() => {
                      setDraft(preset.range);
                      setFocusedValue(preset.range.start);
                      setActivePreset(preset.label);
                    }}>{preset.label}</Button>
                  ))}
                  <Button size="sm" color="tertiary" className={`expense-quick-range${activePreset === "Custom range" ? " is-active" : ""}`} onClick={() => setActivePreset("Custom range")}>Custom range</Button>
                </aside>
                <div className="expense-range-calendar-wrap">
                  <RangeCalendar focusedValue={focusedValue} onFocusChange={setFocusedValue} showInlineInputs={false} />
                </div>
              </div>
              <div className="expense-range-footer">
                <div className="expense-range-fields">
                  <div className="expense-range-field"><span>From</span><InputDateBase slot="start" aria-label="From date" size="sm" wrapperClassName="expense-range-date-input" className="expense-range-date-segments" /></div>
                  <span className="expense-range-separator" aria-hidden="true">→</span>
                  <div className="expense-range-field"><span>To</span><InputDateBase slot="end" aria-label="To date" size="sm" wrapperClassName="expense-range-date-input" className="expense-range-date-segments" /></div>
                </div>
                <div className="expense-range-actions">
                  <Button size="sm" color="secondary" className="expense-range-action" onClick={() => cancel(close)}>Cancel</Button>
                  <Button size="sm" color="primary" className="expense-range-action expense-range-apply" isDisabled={!draft?.start || !draft?.end} onClick={() => apply(close)}>Apply</Button>
                </div>
              </div>
            </>
          )}
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}
