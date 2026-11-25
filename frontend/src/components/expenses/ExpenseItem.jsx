import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../Icon.jsx";
import { categoryColors } from "../../data/categoryColors.js";
import { money } from "../../data/dashboardData.js";

const prettyDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const paymentLabel = (paymentType) => ({ credit: "Credit card", debit: "Debit card", cash: "Cash" }[String(paymentType).toLowerCase()] || paymentType);

export default function ExpenseItem({ expense, onEdit, onDelete }) {
  const palette = categoryColors[expense.category] || categoryColors.Other;
  const [menu, setMenu] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimer = useRef(null);

  const closeMenu = () => setMenu(null);
  const delayClose = () => { closeTimer.current = window.setTimeout(closeMenu, 160); };
  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const openMenu = () => {
    cancelClose();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenu({
      top: rect.bottom + 5 + 76 > window.innerHeight ? rect.top - 81 : rect.bottom + 5,
      left: Math.max(8, Math.min(rect.right - 120, window.innerWidth - 128)),
    });
  };

  useEffect(() => {
    if (!menu) return undefined;
    const onPointerDown = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) closeMenu();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") { closeMenu(); triggerRef.current?.focus(); }
    };
    const onScroll = () => closeMenu();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menu]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <tr className="expense-item">
      <td><div className="expense-item-description"><strong>{expense.description}</strong><span>{prettyDate(expense.date)}</span></div></td>
      <td><span className="category-chip" style={{ backgroundColor: palette.background, color: palette.foreground }}>{expense.category}</span></td>
      <td className="payment-cell">{paymentLabel(expense.payment_type)}</td>
      <td className="amount-column table-amount">−{money(expense.amount)}</td>
      <td className="expense-actions-cell">
        <button ref={triggerRef} type="button" className="expense-actions-trigger" aria-label={`Actions for ${expense.description}`} aria-haspopup="menu" aria-expanded={!!menu} onMouseEnter={openMenu} onMouseLeave={delayClose} onFocus={openMenu} onClick={openMenu} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); openMenu(); requestAnimationFrame(() => menuRef.current?.querySelector("button")?.focus()); } }}><Icon name="verticalDots" size={16} /></button>
        {menu && createPortal(
          <div ref={menuRef} className="expense-actions-menu" role="menu" aria-label={`Actions for ${expense.description}`} style={{ top: menu.top, left: menu.left }} onMouseEnter={cancelClose} onMouseLeave={delayClose}>
            <button type="button" role="menuitem" onClick={() => { closeMenu(); onEdit(expense); }}>Edit</button>
            <button type="button" role="menuitem" onClick={() => { closeMenu(); onDelete(expense); }}>Delete</button>
          </div>, document.body,
        )}
      </td>
    </tr>
  );
}
