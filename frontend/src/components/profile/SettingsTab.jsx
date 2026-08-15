import React from "react";
import { ArrowUpRight, Key, LogOut, Mail, ShieldCheck } from "lucide-react";

const settings = [
    { title: "Email address", detail: "Manage sign-in and account messages.", action: "Update email", href: "/accounts/email/", icon: Mail },
    { title: "Password", detail: "Change the password protecting your picks.", action: "Change password", href: "/accounts/password/change/", icon: Key },
];

export default function SettingsTab({ handleLogout }) {
    return (
        <section className="court-settings-sheet">
            <header>
                <ShieldCheck />
                <div><h3>Account settings</h3><p>Keep your player file secure and current.</p></div>
            </header>
            <div className="court-settings-ledger">
                {settings.map(({ title, detail, action, href, icon: Icon }) => (
                    <a className="court-settings-row" href={href} key={title}>
                        <Icon />
                        <span><strong>{title}</strong><small>{detail}</small></span>
                        <b>{action}</b>
                        <ArrowUpRight />
                    </a>
                ))}
                <button className="court-settings-row court-settings-signout" onClick={handleLogout}>
                    <LogOut />
                    <span><strong>Sign out</strong><small>End this session on this device.</small></span>
                    <b>Log out</b>
                    <ArrowUpRight />
                </button>
            </div>
        </section>
    );
}
