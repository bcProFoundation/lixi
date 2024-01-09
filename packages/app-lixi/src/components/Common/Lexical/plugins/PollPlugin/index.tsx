/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $wrapNodeInElement } from '@lexical/utils';
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  LexicalEditor
} from 'lexical';
import { useEffect, useState } from 'react';
import * as React from 'react';

import { $createPollNode, createPollOption, PollNode } from '../../nodes/PollNode';
import { Button, Input, Modal } from 'antd';
import { BarChartOutlined, CloseOutlined } from '@ant-design/icons';
import styled from 'styled-components';

export const INSERT_POLL_COMMAND: LexicalCommand<string> = createCommand('INSERT_POLL_COMMAND');

const InsertPollContainer = styled.div`
  .poll-header {
    h3 {
      font-size: 22px;
      font-weight: 500;
    }
  }
  .poll-content {
    padding: 1rem 0;
    border-top: 1px solid #d5d5d5;
    .ant-input {
      min-height: 38px;
    }
  }
  .poll-footer {
    text-align: right;
  }
`;

export function InsertPollDialog({
  activeEditor,
  onClose
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const [question, setQuestion] = useState('');

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_POLL_COMMAND, question);
    onClose();
  };

  return (
    <>
      {/* <TextInput label="Question" onChange={setQuestion} value={question} /> */}
      <Input addonBefore="Question" value={question} onChange={event => setQuestion(event.target.value)} />;
      {/* <DialogActions>
        <Button disabled={question.trim() === ''} onClick={onClick}>
          Confirm
        </Button>
      </DialogActions> */}
      <Button
        type="text"
        className="no-border-btn"
        disabled={question.trim() === ''}
        icon={<CloseOutlined />}
        onClick={onClick}
      />
    </>
  );
}

export default function PollPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [question, setQuestion] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const onClick = () => {
    editor.dispatchCommand(INSERT_POLL_COMMAND, question);
    setQuestion('');
    handleOk();
  };

  useEffect(() => {
    if (!editor.hasNodes([PollNode])) {
      throw new Error('PollPlugin: PollNode not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_POLL_COMMAND,
      payload => {
        const pollNode = $createPollNode(payload, [createPollOption(), createPollOption()]);
        $insertNodes([pollNode]);
        if ($isRootOrShadowRoot(pollNode.getParentOrThrow())) {
          $wrapNodeInElement(pollNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return (
    <>
      <Button type="text" onClick={showModal}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          className="bi bi-bar-chart-line-fill"
          viewBox="0 0 16 16"
        >
          <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1z" />
        </svg>
      </Button>
      <Modal width={'fit-content'} footer={null} open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
        <InsertPollContainer>
          <div className="poll-header">
            <h3>Insert Poll</h3>
          </div>
          <div className="poll-content">
            <Input addonBefore="Question" value={question} onChange={event => setQuestion(event.target.value)} />
          </div>
          <div className="poll-footer">
            <Button type="primary" disabled={question.trim() === ''} onClick={onClick}>
              Confirm
            </Button>
          </div>
        </InsertPollContainer>
      </Modal>
    </>
  );
}
