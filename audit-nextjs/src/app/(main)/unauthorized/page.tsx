// unauthorized.tsx
// Unauthorized (403) Page - Minimal & Elegant with Dark/Light Mode
// Version: 1.0.0 | Date: 2026-04-30 16:10:00 | Created: Minimal unauthorized page with theme support

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft, Home } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Subtle Grid Background - adapts to theme */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:32px_32px] opacity-20"
        style={{
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 50%, #000, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 50% at 50% 50%, #000, transparent)",
        }}
      />
      
      <div className="relative w-full max-w-md">
        <div className="text-center space-y-8">
          {/* Icon with Gradient - theme aware */}
          <div className="inline-flex">
            <div className="relative">
              {/* Glow effect - changes with theme */}
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/30 via-destructive/10 to-transparent blur-3xl rounded-full dark:from-destructive/40 dark:via-destructive/20" />
              
              {/* Icon Container */}
              <div className="relative bg-background border-2 border-destructive/30 rounded-full p-6 shadow-lg dark:border-destructive/40 dark:shadow-destructive/5">
                <ShieldX 
                  className="w-16 h-16 text-destructive dark:text-destructive" 
                  strokeWidth={1.5} 
                />
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-3">
            {/* Large 403 - subtle in light, more visible in dark */}
            <h1 className="text-7xl font-bold text-muted-foreground/10 tracking-tight dark:text-muted-foreground/20">
              403
            </h1>
            
            {/* Main Title */}
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              ไม่มีสิทธิ์เข้าถึง
            </h2>
            
            {/* Description */}
            <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
              คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้
              <br />
              กรุณาติดต่อผู้ดูแลระบบหากคุณคิดว่านี่เป็นข้อผิดพลาด
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.back()}
              className="gap-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              ย้อนกลับ
            </Button>
            <Button
              size="lg"
              onClick={() => router.push("/")}
              className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
            >
              <Home className="w-4 h-4" />
              หน้าหลัก
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-xs text-muted-foreground/70">
            PTEC Audit System © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Decorative Elements - theme aware */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 dark:from-primary/10" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-tl from-destructive/5 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2 dark:from-destructive/10" />
    </div>
  );
}