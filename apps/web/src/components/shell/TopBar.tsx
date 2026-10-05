import Link from "next/link";
import { Wordmark } from "../brand";
import { GoCircle } from "../ui/icons";
import { MobileMenu } from "./MobileMenu";
import { AccountButton } from "./AccountButton";

export function TopBar() {
  return (
    <header className="flex h-[72px] items-center justify-between pr-[16px] pl-[8px] sm:pr-[30px] lg:pl-[15px]">
      <div className="flex min-w-0 items-center gap-[4px]">
        <MobileMenu />
        <Wordmark />
      </div>
      <div className="flex items-center gap-[15px]">
        <a href="mailto:support@trycanopy.space?subject=OnBrand%20API%20support" className="btn-outline max-md:hidden">
          Support
        </a>
        <Link href="/app/docs" className="btn-outline max-md:hidden">
          Open Docs
        </Link>
        <Link href="/app/billing" aria-label="Add credits" className="flex items-center gap-[8px] text-[13.5px] text-cream transition-opacity hover:opacity-80 md:ml-[20px]">
          <span className="max-sm:hidden">Add Credits</span>
          <GoCircle size={28} />
        </Link>
        <AccountButton />
      </div>
    </header>
  );
}
