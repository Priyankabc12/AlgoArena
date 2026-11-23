"use client";

import Editor from "@monaco-editor/react";

interface PythonEditorProps {
  code: string;
  onChange: (code: string) => void;
}

export default function PythonEditor({
  code,
  onChange,
}: PythonEditorProps) {
  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      value={code}
      onChange={(value) => onChange(value ?? "")}
      loading={
        <textarea
          aria-label="Python source code"
          value={code}
          onChange={(event) => onChange(event.target.value)}
        />
      }
      theme="vs-dark"
      options={{
        ariaLabel: "Python source code",
        minimap: {
          enabled: false,
        },
        fontSize: 14,
        padding: { top: 10, bottom: 8 },
        automaticLayout: true,
      }}
    />
  );
}
