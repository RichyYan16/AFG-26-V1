import Image from "next/image";

/*
Header component for the Unstuck app, displaying the logo and app name and svg that displays user workflow of app
Used Claude Haiku 4.5 to generate code structure and styling based on the following prompt:

Prompt: Design a header component for my Unstuck app. It should include the Unstuck logo on the left, the app name "Unstuck" in a bold, modern font, and a tagline "App for academic paralysis" below the name. 
The header should have a rounded border and a subtle background color with some transparency. Use Tailwind CSS for styling and make sure it looks good on both desktop and mobile.

All logic was implemented by the authors
*/

// Header component that displays the Unstuck logo, app name, and tagline with styling for both desktop and mobile using Tailwind CSS.
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
