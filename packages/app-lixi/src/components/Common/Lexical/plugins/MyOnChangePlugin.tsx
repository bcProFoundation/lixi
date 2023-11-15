import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { useEffect } from 'react';

const MyOnChangePlugin = ({ setStateHtmlContent, setStatePureContent }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const pureContent = root.__cachedText;
        setStatePureContent(pureContent);
      });

      let htmlContent = editor.getRootElement().innerHTML;
      setStateHtmlContent(htmlContent);
    });
  }, [editor]);

  return null;
};

export default MyOnChangePlugin;
