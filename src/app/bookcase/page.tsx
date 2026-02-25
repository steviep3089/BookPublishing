import { Suspense } from "react";
import EditableBookcaseHome from "@/components/EditableBookcaseHome";

export default function BookcasePage() {
  return (
    <Suspense fallback={<main className="bookcase-scene"><div className="bookcase-canvas" /></main>}>
      <EditableBookcaseHome />
    </Suspense>
  );
}
