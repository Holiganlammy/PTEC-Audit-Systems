// components/ErrorBoundary.tsx
"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("Error caught by boundary:", error, errorInfo);
    
    // ส่ง error log ไป backend หรือ monitoring service
    if (process.env.NODE_ENV === 'production') {
      // ส่งไป Sentry, LogRocket, หรือ backend logger
      // logErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900">
              เกิดข้อผิดพลาด
            </h1>
            
            <p className="text-gray-600">
              ขออภัย เกิดข้อผิดพลาดในการแสดงผลหน้านี้
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 text-left">
                <p className="text-xs text-red-800 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
              >
                กลับหน้าหลัก
              </Button>
              <Button
                onClick={() => window.location.reload()}
              >
                โหลดหน้าใหม่
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}