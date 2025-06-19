"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <SignUp
        appearance={{
          baseTheme: dark,
          elements: {
            card: "bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-lg",
            headerTitle: "text-white text-2xl font-semibold",
            headerSubtitle: "text-neutral-400",
            socialButtons: "bg-neutral-900 hover:bg-neutral-800 border border-neutral-700",
            formFieldInput: "bg-neutral-900 text-white border border-neutral-700",
            formButtonPrimary: "bg-white text-black hover:bg-neutral-200 font-semibold",
            footerActionText: "text-neutral-400",
            footerActionLink: "text-blue-500 hover:underline",
          },
        }}
      />
    </div>
  );
}
