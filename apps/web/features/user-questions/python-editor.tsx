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
      height="600px"
      defaultLanguage="python"
      value={code}
      onChange={(value) => onChange(value ?? "")}
      theme="vs-dark"
      options={{
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