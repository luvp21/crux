import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInPanel } from "./sign-in-panel";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/crew/new");

  return (
    <div style={{ minHeight: "calc(100vh - 40px)", display: "grid", placeItems: "center", padding: "48px 24px" }}>
      <SignInPanel devMode={process.env.NODE_ENV !== "production"} />
    </div>
  );
}
