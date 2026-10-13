import "./globals.css";
import { Toaster } from "sonner";
import Providers from "@/components/providers";
export const metadata = {
  title: "SpaceSketch — Your space, reimagined",
  description: "An interactive 2D and 3D interior design studio.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
