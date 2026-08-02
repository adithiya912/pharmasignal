import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-display text-2xl text-foreground">
          PharmaSignal
        </h1>
        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#7A9B76",
              colorBackground: "#F6F1E7",
              colorForeground: "#241F18",
              fontFamily: "var(--font-body)",
              borderRadius: "0.5rem",
            },
          }}
        />
      </div>
    </div>
  );
}
