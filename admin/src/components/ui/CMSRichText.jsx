import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  RemoveFormatting
} from 'lucide-react';

export default function CMSRichText({
  label,
  value = '',
  onChange,
  maxLength,
  description,
  error
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes BulletList and OrderedList by default
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-admin-accent-hi underline cursor-pointer'
        }
      })
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none text-admin-text [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-admin-accent [&_a]:underline'
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // If editor is empty, return empty string
      const isEmpty = editor.isEmpty;
      if (onChange) onChange(isEmpty ? '' : html);
    }
  });

  // Sync value from parent if it changes externally
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    
    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const plainText = editor.getText();
  const charCount = plainText.length;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-xs font-semibold text-admin-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        {maxLength && (
          <span className={`text-[10px] ${charCount >= maxLength ? 'text-admin-danger' : 'text-admin-muted'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>

      <div className={`glass-panel rounded-xl overflow-hidden border ${
        error ? 'border-admin-danger' : 'border-admin-border'
      } bg-admin-surface-2/40`}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-admin-surface border-b border-admin-border select-none">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${editor.isActive('bold') ? 'bg-admin-accent text-white hover:bg-admin-accent' : 'text-admin-muted'}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${editor.isActive('italic') ? 'bg-admin-accent text-white hover:bg-admin-accent' : 'text-admin-muted'}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${editor.isActive('underline') ? 'bg-admin-accent text-white hover:bg-admin-accent' : 'text-admin-muted'}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-admin-border mx-1" />

          <button
            type="button"
            onClick={setLink}
            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${editor.isActive('link') ? 'bg-admin-accent text-white hover:bg-admin-accent' : 'text-admin-muted'}`}
            title="Link"
          >
            <Link2 className="w-4 h-4" />
          </button>

          {editor.isActive('link') && (
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="p-1.5 rounded-lg hover:bg-white/5 text-admin-danger hover:text-red-400 transition-colors"
              title="Remove Link"
            >
              <Link2Off className="w-4 h-4" />
            </button>
          )}

          <div className="w-[1px] h-4 bg-admin-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${editor.isActive('bulletList') ? 'bg-admin-accent text-white hover:bg-admin-accent' : 'text-admin-muted'}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${editor.isActive('orderedList') ? 'bg-admin-accent text-white hover:bg-admin-accent' : 'text-admin-muted'}`}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-admin-border mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className="p-1.5 rounded-lg hover:bg-white/5 text-admin-muted hover:text-admin-text transition-colors"
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>

        {/* Editor Area */}
        <div className="p-4 min-h-[150px] max-h-[300px] overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      {description && !error && (
        <p className="text-[11px] text-admin-muted/80">{description}</p>
      )}

      {error && (
        <span className="text-xs text-admin-danger font-medium mt-0.5">{error}</span>
      )}
    </div>
  );
}
