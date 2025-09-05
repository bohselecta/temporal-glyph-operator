import fetch from "node-fetch";
const owner = process.env.GH_OWNER;
const repo = process.env.GH_REPO;
const token = process.env.GITHUB_TOKEN;

const labels = [
  { name: "feature", color: "1f883d", description: "New capability" },
  { name: "bug", color: "d73a4a", description: "Something broken" },
  { name: "tech-debt", color: "6e7781", description: "Refactor/cleanup" },
  { name: "performance", color: "fbca04", description: "Perf guards & tuning" },
  { name: "rfc", color: "0e8a16", description: "Design proposal" },
  { name: "good-first-issue", color: "7057ff", description: "Starter task" }
];

for (const l of labels) {
  await fetch(`https://api.github.com/repos/${owner}/${repo}/labels`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(l)
  }).then(r => r.ok || r.status===422 ? r : r.text().then(t => Promise.reject(t)));
  console.log("Label ensured:", l.name);
}
