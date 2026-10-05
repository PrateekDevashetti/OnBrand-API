import Link from "next/link";
export default function Landing() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Link className="btn-outline" href="/app">Open dashboard</Link>
    </main>
  );
}
