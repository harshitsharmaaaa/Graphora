import type { ExampleEntity } from "@eraser/shared-types";
import { exampleEntitySchema } from "@eraser/shared-validation";
import { Button } from "@eraser/ui";
import { useState } from "react";
import { env } from "@/lib/env";
import "./index.css";

// Smoke-test: proves `apps/frontend` resolves the shared workspaces.
// Removed once real whiteboard state lands.
const demoEntity: ExampleEntity = {
  id: "demo-1",
  name: "Monorepo foundation",
  createdAt: new Date().toISOString(),
};

const parsed = exampleEntitySchema.safeParse(demoEntity);

export default function App() {
  const [apiStatus, setApiStatus] = useState<string>("not checked");

  async function checkApiHealth() {
    try {
      const res = await fetch(`${env.apiUrl}/health`);
      const data = (await res.json()) as { status?: string };
      setApiStatus(data.status ?? `HTTP ${res.status.toString()}`);
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : "unreachable");
    }
  }

  return (
    <main className="card">
      <h1>
        <span className="status-dot" aria-hidden="true" />
        Frontend is running
      </h1>
      <p>
        Vite + React + TypeScript foundation is up. Shared packages resolve: <code>@eraser/ui</code>
        , <code>@eraser/shared-types</code>, <code>@eraser/shared-validation</code>.
      </p>
      <p>
        Validation smoke-test: <code>{parsed.success ? "example entity valid" : "invalid"}</code>
      </p>
      <p>
        API health (<code>{env.apiUrl}/health</code>): <code>{apiStatus}</code>
      </p>
      <Button
        onClick={() => {
          void checkApiHealth();
        }}
      >
        Check API health
      </Button>
    </main>
  );
}
