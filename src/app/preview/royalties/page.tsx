import { notFound } from "next/navigation";
import { RoyaltyPreview } from "./preview";

export const dynamic = "force-dynamic";

export default function Page() {
  // Preview fixtures never enter the production dashboard or royalty API.
  if (process.env.NODE_ENV !== "development") notFound();
  return <RoyaltyPreview />;
}
