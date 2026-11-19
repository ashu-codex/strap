'use client';

import React, { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B7F34A] border-t-transparent" />
        </div>
      }
    >
      <AuthForm initialMode="login" />
    </Suspense>
  );
}
