import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { Button } from 'antd';
import React, { useEffect } from 'react';
import intl from 'react-intl-universal';
import _ from 'lodash';
import { POST_TYPE } from '@bcpros/lixi-models/constants';

// Lexical React plugins are React components, which makes them
// highly composable. Furthermore, you can lazy load plugins if
// desired, so you don't pay the cost for plugins until you
// actually use them.
const CustomButtonSubmitPlugin = props => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Focus the editor when the effect fires!
    editor.focus();
  }, [editor]);

  const getEditorStateTextString = () => {
    const stringifiedEditorState = JSON.stringify(editor.getEditorState().toJSON());
    const parsedEditorState = editor.parseEditorState(stringifiedEditorState);

    const editorStateTextString = parsedEditorState.read(() => $getRoot().getTextContent());

    return editorStateTextString;
  };

  const handleClick = () => {
    editor.update(() => {
      const rootElementString = editor.getRootElement().innerHTML;

      props.onSubmit({
        htmlContent: rootElementString,
        pureContent: getEditorStateTextString(),
        postType: POST_TYPE.POST
      });
    });
  };
  const invalidPost = (_.trim(props.currentContent) === '' && props.image.length === 0) || props.overLimitContent;

  return (
    <Button
      style={{ textTransform: 'uppercase' }}
      className="EditorLexical_submit"
      type="primary"
      onClick={handleClick}
      loading={props.loading}
      disabled={invalidPost}
    >
      {intl.get('general.post')}
    </Button>
  );
};

export default CustomButtonSubmitPlugin;
