"use client";

import { useState } from "react";
import { LogoutIcon } from "../ui/icons";

type P = { name: string; email: string; companyName: string; companyWebsite: string };

export function ProfileView({ initial, clerk }: { initial: P; clerk: boolean }) {
  const [p, setP] = useState(initial);
  const [saved, setSaved] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    const r = await fetch("/api/v1/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: p.name, email: p.email, company_name: p.companyName, company_website: p.companyWebsite }) });
    setSaved(r.ok ? "Saved" : "Could not save");
    setTimeout(() => setSaved(""), 1800);
  }
  async function logout() {
    if (clerk) {
      const { Clerk } = window as unknown as { Clerk?: { signOut: (o: { redirectUrl: string }) => Promise<void> } };
      await Clerk?.signOut({ redirectUrl: "/" });
    } else window.location.href = "/";
  }
  async function openClerk() {
    const { Clerk } = window as unknown as { Clerk?: { openUserProfile: () => void } };
    if (Clerk) Clerk.openUserProfile();
    else setSaved("Account security is managed by your sign-in provider once auth is enabled.");
  }
  const field = (label: string, key: keyof P, placeholder: string) => (
    <label className="block">
      <span className="mb-[8px] block text-[11.5px] text-dim">{label}</span>
      <input className="field h-[32px]" placeholder={placeholder} value={p[key]} onChange={(e) => setP({ ...p, [key]: e.target.value })} />
    </label>
  );
  const row = (title: string, desc: string, action: string, onClick: () => void, danger = false) => (
    <div className="flex h-[74px] items-center justify-between rounded-[2px] border border-[#2c2c2b] px-[17px]">
      <div>
        <div className="text-[13.5px] font-medium text-cream">{title}</div>
        <div className="mt-[6px] text-[11.5px] text-dim">{desc}</div>
      </div>
      <button type="button" onClick={onClick} className={`text-[11.5px] ${danger ? "text-dim hover:text-bad" : "text-dim hover:text-cream"}`}>
        {action}
      </button>
    </div>
  );
  return (
    <div className="px-[50px] pt-[52px] pb-[40px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[37px] leading-none text-cream">Profile Settings</h1>
          <p className="mt-[16px] text-[19px] text-dim">Manage your account information, notification and preferences</p>
        </div>
        <button type="button" onClick={logout} className="flex h-[44px] items-center gap-[8px] rounded-[4px] border border-cream/90 px-[20px] text-[15.5px] text-cream hover:bg-cream hover:text-ink">
          <LogoutIcon /> Logout
        </button>
      </div>
      <div className="mt-[26px] grid grid-cols-2 gap-x-[24px] gap-y-[22px]">
        {field("Full Name", "name", "Full Name")}
        {field("Email Address", "email", "Email Address")}
        {field("Company Name", "companyName", "Company Name")}
        {field("Company Website", "companyWebsite", "Company Website")}
      </div>
      <div className="mt-[32px] flex items-center justify-end gap-4">
        {saved && <span className="text-[12px] text-dim">{saved}</span>}
        <button type="button" onClick={save} className="btn-solid">Save Changes</button>
      </div>
      <h2 className="mt-[50px] text-[20px] text-cream">Account</h2>
      <div className="mt-[20px] space-y-[18px]">
        {row("Password", "Set a unique password for your account", "Change Password", openClerk)}
        {row("Connected Accounts", "Manage OAuth connections", "Connected Accounts", openClerk)}
        {confirmDelete ? (
          <div className="flex h-[74px] items-center justify-between rounded-[2px] border border-bad/50 px-[17px]">
            <span className="text-[13px] text-cream">Delete your account, keys and all extraction data? This cannot be undone.</span>
            <span className="flex gap-4 text-[12px]">
              <button className="text-dim hover:text-cream" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="text-bad hover:underline" onClick={async () => { await fetch("/api/v1/me", { method: "DELETE" }); await logout(); }}>Delete permanently</button>
            </span>
          </div>
        ) : (
          row("Delete Account", "Permanently delete account and all your data", "Delete Account", () => setConfirmDelete(true), true)
        )}
      </div>
    </div>
  );
}
