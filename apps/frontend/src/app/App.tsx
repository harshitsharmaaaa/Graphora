/** Graphora editor entry: create the engine once and mount the shell. */
import { useEffect } from "react";
import { EditorShell } from "../editor/EditorShell.js";
import { useEditorApp } from "../editor/hooks.js";

export default function App() {
  const app = useEditorApp();
  useEffect(() => {
    const flush = (): void => {
      app.flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [app]);
  return <EditorShell app={app} />;
}
