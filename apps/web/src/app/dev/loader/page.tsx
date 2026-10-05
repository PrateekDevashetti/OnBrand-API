import { notFound } from "next/navigation";
import { Coverflow } from "@/components/Coverflow";

/** Dev-only visual check for the loader. */
export default function LoaderPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-24 bg-chrome">
      <Coverflow />
      <div className="w-full max-w-[1100px] rounded-[14px] bg-white py-10">
        <Coverflow />
      </div>
    </div>
  );
}
