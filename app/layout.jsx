import "./globals.css";
import AutoLoginProvider from "@/components/AutoLoginProvider";

export const metadata = {
  title: "FitNation Gym CRM",
  description: "Modern Gym Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AutoLoginProvider />
        {children}
      </body>
    </html>
  );
}
