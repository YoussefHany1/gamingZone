import React from "react";
import { Gamepad2 } from "lucide-react";
import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-linear-to-br from-primary-bg via-dark-bg to-primary-bg" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-light-blue/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary-blue/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <Image
            src="/assets/logo.png"
            alt="Gaming Zone Logo"
            width={200}
            height={200}
          />
        </div>

        {/* Card */}
        {children}
      </div>
    </div>
  );
}
