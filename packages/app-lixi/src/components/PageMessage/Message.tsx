import React from 'react';
import { MessageQuery } from '@store/message/message.generated';
import styled from 'styled-components';

type MessageItem = {
  message: MessageQuery['message']; //MessageItem
  authorAddress: string; //Need address here to check own message
};

const StyledMessageContainer = styled.div`
  display: flex;
`;

const StyledChat = styled.p`
  width: fit-content;
  border: 1px solid black;
  margin-bottom: 10px;
  padding: 5px;
  border-radius: var(--border-radius-primary);
`;

const Message = ({ message, authorAddress }: MessageItem) => {
  console.log('🚀 ~ file: Message.tsx:19 ~ Message ~ authorAddress:', authorAddress);
  console.log('🚀 ~ file: Message.tsx:23 ~ Message ~ message.author.address:', message.author.address);
  console.log(
    '🚀 ~ file: Message.tsx:25 ~ Message ~  message.author.address === authorAddress:',
    message.author.address === authorAddress
  );

  return (
    <React.Fragment>
      <StyledMessageContainer
        style={{ flexDirection: message.author.address === authorAddress ? 'row-reverse' : 'row' }}
      >
        <StyledChat>{message.body}</StyledChat>
      </StyledMessageContainer>
    </React.Fragment>
  );
};

export default Message;
