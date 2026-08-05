import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
          PharmaSignal
        </h1>
        <SignIn
          fallbackRedirectUrl="/onboarding/role"
          appearance={{
            variables: {
              colorPrimary: "oklch(0.6 0.19 280)",
              fontFamily: "var(--font-body)",
              borderRadius: "0.75rem",
            },
          }}
        />
      </div>
    </div>
  );
}
