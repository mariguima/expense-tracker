import { useState } from "react";
import { parseDate } from "@internationalized/date";
import { DatePicker as UntitledDatePicker } from "../application/date-picker/date-picker";

export default function DatePicker({ id, name, value, onChange, required = false, invalid = false, describedBy }) {
  const [draft, setDraft] = useState(value ? parseDate(value) : null);

  return (
    <UntitledDatePicker
      id={id}
      aria-label="Date"
      className="app-date-picker"
      name={name}
      value={draft}
      onChange={setDraft}
      onApply={() => {
        if (draft) onChange?.({ target: { name, value: draft.toString() } });
      }}
      onCancel={() => setDraft(value ? parseDate(value) : null)}
      isRequired={required}
      isInvalid={invalid}
      aria-describedby={describedBy}
      size="sm"
    />
  );
}
