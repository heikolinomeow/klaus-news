/**
 * ArticleEditor component - Quill.js WYSIWYG editor for articles
 */
import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface ArticleEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function ArticleEditor({ content, onChange }: ArticleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            ['link'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ]
        }
      });

      quillRef.current.on('text-change', () => {
        if (quillRef.current) {
          onChange(quillRef.current.root.innerHTML);
        }
      });
    }

    if (quillRef.current && content) {
      quillRef.current.root.innerHTML = content;
    }
  }, [content, onChange]);

  return <div ref={editorRef} />;
}

export default ArticleEditor;
