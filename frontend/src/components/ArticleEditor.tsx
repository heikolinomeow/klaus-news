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
  const onChangeRef = useRef(onChange);
  const isInternalChange = useRef(false);

  // Keep onChange ref up to date
  onChangeRef.current = onChange;

  // Initialize Quill editor once on mount
  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    const quill = new Quill(editorRef.current, {
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

    // Set initial content using Quill's clipboard API
    if (content) {
      quill.clipboard.dangerouslyPasteHTML(content);
    }

    quill.on('text-change', () => {
      isInternalChange.current = true;
      onChangeRef.current(quill.root.innerHTML);
    });

    quillRef.current = quill;

    return () => {
      quillRef.current = null;
    };
  }, []); // Empty deps - only run on mount

  // Handle external content changes (e.g., switching articles)
  useEffect(() => {
    if (!quillRef.current) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    // External change - update editor content
    const currentHtml = quillRef.current.root.innerHTML;
    if (content !== currentHtml) {
      quillRef.current.clipboard.dangerouslyPasteHTML(content || '');
    }
  }, [content]);

  return <div ref={editorRef} />;
}

export default ArticleEditor;
