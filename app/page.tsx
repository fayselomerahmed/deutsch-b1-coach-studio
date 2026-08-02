import type { Metadata } from "next";
import { getChatGPTUser } from "./chatgpt-auth";
import { AdminPortal } from "./admin-portal";

export const metadata: Metadata = {
  title: "Deutsch Coach Content Studio",
  description: "Secure live curriculum publishing for Deutsch B1 Coach.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <AdminPortal
      user={user ? { displayName: user.displayName, email: user.email } : null}
    />
  );
}
