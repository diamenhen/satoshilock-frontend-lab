import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from './providers';
import Navbar from './Navbar';
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'SatoshiLock',
  description: 'Lock and distribute ERC-20 tokens over time on Ethereum, Base, and BSC. Audited, non-custodial, open source.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}