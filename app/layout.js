import "./globals.css";

export const metadata = {
  title: "Ad Astra",
  description: "Ad Astra learning platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
