import Image from "next/image";

export function Header() {
  return (
    <header className="rounded-2xl border border-emerald-900 bg-emerald-950/70 p-4 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/images/stuck-logo.png"
            alt="Unstuck logo"
            width={126}
            height={102}
            className="h-16 w-auto rounded-xl border border-emerald-800 bg-white p-1"
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Unstuck
            </h1>
            <p className="text-sm text-emerald-200 md:text-base">
              App for academic paralysis.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
