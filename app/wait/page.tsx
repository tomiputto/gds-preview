import { Suspense } from "react";
import WaitClient from "./wait-client";

export default function WaitPage() {
  return (
    <Suspense>
      <WaitClient />
    </Suspense>
  );
}
