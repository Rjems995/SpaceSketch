import AuthPage from "@/components/auth-page";
import { authDestination } from "@/lib/auth-navigation";
export const metadata = { title: "Create an account | SpaceSketch" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <AuthPage mode="signup" destination={authDestination(params.next)} />;
}
