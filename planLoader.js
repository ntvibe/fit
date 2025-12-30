export async function loadPlan() {
  const response = await fetch("../data/week1.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load plan: ${response.status}`);
  }
  return response.json();
}
