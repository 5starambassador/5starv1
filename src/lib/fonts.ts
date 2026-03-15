import { Outfit } from "next/font/google";

export const outfit = Outfit({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-outfit",
    adjustFontFallback: false,
});
