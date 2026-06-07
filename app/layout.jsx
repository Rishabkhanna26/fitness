import "./globals.css";

export const metadata = {
  title: "FitNation Gym CRM",
  description: "Modern Gym Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
