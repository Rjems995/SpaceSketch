import Image from "next/image";
import logo from "@/public/spacesketch-logo.png";

export default function BrandLogo({ large = false }: { large?: boolean }) {
  return (
    <Image
      src={logo}
      alt="SpaceSketch"
      className={large ? "brand-logo brand-logo-large" : "brand-logo"}
      sizes={large ? "240px" : "96px"}
    />
  );
}
