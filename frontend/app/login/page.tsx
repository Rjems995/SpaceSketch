import AuthPage from "@/components/auth-page";
import { authDestination } from "@/lib/auth-navigation";
export const metadata = { title: "Log in | SpaceSketch" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <AuthPage mode="login" destination={authDestination(params.next)} />;
}
