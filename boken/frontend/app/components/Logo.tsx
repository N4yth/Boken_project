import Image from "next/image";

// The PNG has a white background: multiply hides it on paper, and in dark mode
// the inverted image is screened so only the (now gold) lettering remains.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`relative block h-11 w-20 overflow-hidden ${className}`}>
      <Image
        src="/images/Boken_title.png"
        alt="Boken"
        width={100}
        height={67}
        priority
        className="absolute -left-[11px] -top-[6px] h-auto w-[100px] max-w-none mix-blend-multiply dark:mix-blend-screen dark:invert"
      />
    </span>
  );
}
