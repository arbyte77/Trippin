
import "./globals.css";
import { Providers } from "./providers";
import type { ReactNode } from "react";
import { TripProvider } from "./context/TripContext";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "Trippin",
  description: "Your travel planning app",
};




export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <TripProvider>
            <Navbar />
            {children}
          </TripProvider>
        </Providers>
      </body>
    </html>
  );
}
