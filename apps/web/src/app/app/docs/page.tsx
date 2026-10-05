import { redirect } from "next/navigation";

/** Docs are public; the dashboard link lands on /docs. */
export default function DashboardDocs() {
  redirect("/docs");
}
