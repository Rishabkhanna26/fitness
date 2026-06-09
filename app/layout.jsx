import "./globals.css";

export const metadata = {
  title: "Optimus Gym CRM",
  description: "Modern Gym Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
