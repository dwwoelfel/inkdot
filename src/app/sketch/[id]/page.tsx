'use client';

import { db } from '@/lib/db';
import { SketchPageContent } from './SketchPageContent';

function SignedInSketchPage() {
  const user = db.useUser();
  return <SketchPageContent user={user} />;
}

export default function SketchPage() {
  return (
    <>
      <db.SignedIn>
        <SignedInSketchPage />
      </db.SignedIn>
      <db.SignedOut>
        <SketchPageContent />
      </db.SignedOut>
    </>
  );
}
