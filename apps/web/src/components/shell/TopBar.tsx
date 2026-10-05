import Link from "next/link";
import { Wordmark } from "../brand";
import { GoCircle } from "../ui/icons";

export function TopBar() {
  return (
    <header className="flex h-[72px] items-center justify-between pr-[30px] pl-[15px]">
      <Wordmark />
      <div className="flex items-center gap-[15px]">
        <a href="mailto:support@trycanopy.space?subject=OnBrand%20API%20support" className="btn-outline">
          Support
        </a>
        <Link href="/app/docs" className="btn-outline">
          Open Docs
        </Link>
        <Link href="/app/billing" className="ml-[20px] flex items-center gap-[8px] text-[13.5px] text-cream transition-opacity hover:opacity-80">
          Add Credits
          <GoCircle size={28} />
        </Link>
      </div>
    </header>
  );
}
