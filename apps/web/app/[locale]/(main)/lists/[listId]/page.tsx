"use client";

import { ListDetailsClient } from "@/features/lists";

export default function ListGamesPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  return <ListDetailsClient listIdPromise={params} />;
}
