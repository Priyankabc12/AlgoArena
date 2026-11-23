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
      height="440px"
      defaultLanguage="python"
      value={code}
      onChange={(value) => onChange(value ?? "")}
      loading={
        <textarea
          aria-label="Python source code"
          value={code}
          onChange={(event) => onChange(event.target.value)}
          style={{ width: "100%", height: "100%", background: "#1e1e1e", color: "#f2f0ea" }}
        />
      }
      theme="vs-dark"
      options={{
        ariaLabel: "Python source code",
        minimap: {
          enabled: false,
        },
        fontSize: 15,
        automaticLayout: true,
      }}
    />
  );
}
/*Instead of using a normal <textarea>,

we're using
<Editor />

which is Monaco Editor (the same editor used in VS Code).

This gives us:

✅ syntax highlighting

✅ line numbers

✅ auto indentation

✅ bracket matching

✅ VS Code feel*/
