/** Graphora editor entry: create the engine once and mount the shell. */
import { EditorShell } from "../editor/EditorShell.js";
import { useEditorApp } from "../editor/hooks.js";

export default function App() {
  const app = useEditorApp();
  return <EditorShell app={app} />;
}
