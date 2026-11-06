import { buttonClass } from "@/lib/classes";
import { SHARE_CTA } from "@/lib/copy";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-4xl">This card has faded away</h1>
      <p className="text-sm leading-6 text-white/75">The reading is no longer here.</p>
      <Link href="/" className={buttonClass()}>
        {SHARE_CTA}
      </Link>
    </div>
  );
}
