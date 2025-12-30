export function getRoute() {
  const hash = window.location.hash || "#/";
  const cleaned = hash.replace(/^#/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { name: "home" };
  }
  if (parts[0] === "training" && parts[1]) {
    return { name: "training", id: parts[1] };
  }
  if (parts[0] === "run" && parts[1]) {
    return { name: "run", id: parts[1] };
  }
  if (parts[0] === "history") {
    return { name: "history" };
  }
  return { name: "home" };
}

export function onRouteChange(handler) {
  window.addEventListener("hashchange", handler);
}
