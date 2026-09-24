import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function MainLoading() {
  return (
    <main className="grow flex items-center justify-center py-24">
      <LoadingSpinner />
    </main>
  );
}
