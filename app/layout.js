import "./globals.css";
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "Ad Astra",
  description: "Ad Astra learning platform",
  icons: {
    icon: "/images/ad-astra-logo.png",
    shortcut: "/images/ad-astra-logo.png",
    apple: "/images/ad-astra-logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
