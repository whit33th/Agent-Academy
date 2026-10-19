"use server";

import { getAllApiAgents } from "@/lib/data/agents";

export async function loadBoardAgents() {
  return getAllApiAgents();
}
