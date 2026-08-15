import React from "react";

export function ScorebookTable({ as: Element = "section", className = "", children, ...props }) {
    return <Element className={`court-scorebook-table ${className}`.trim()} {...props}>{children}</Element>;
}

export function ScorebookHeader({ className = "", children }) {
    return <div className={`court-scorebook-header ${className}`.trim()}>{children}</div>;
}

export function ScorebookRow({ as: Element = "div", className = "", children, ...props }) {
    return <Element className={`court-scorebook-row ${className}`.trim()} {...props}>{children}</Element>;
}

export function ScorebookNumber({ as: Element = "strong", className = "", children }) {
    return <Element className={`court-scorebook-number ${className}`.trim()}>{children}</Element>;
}
