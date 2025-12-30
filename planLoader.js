export async function loadPlan() {
  const planUrl = new URL("./data/week1.json", window.location.href);
  const response = await fetch(planUrl.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load plan: ${response.status}`);
  }
  return response.json();
}
