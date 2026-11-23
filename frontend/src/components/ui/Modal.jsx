import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({
    isOpen,
    title,
    children,
    onClose,
    className = "",
}) {
    const titleId = useId();
    const dialogRef = useRef(null);
    useEffect(() => {
        if (!isOpen) return undefined;
        const previousFocus = document.activeElement;
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
            if (event.key !== "Tab") return;
            const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener("keydown", onKeyDown);
        requestAnimationFrame(() => dialogRef.current?.querySelector("input, button")?.focus());
        return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus?.(); };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return createPortal(
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <div ref={dialogRef} className={`modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <div className="modal-header">
                    <h2 id={titleId} className="modal-title">{title}</h2>
                    <button
                        className="modal-close"
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>, document.body,
    );
}
