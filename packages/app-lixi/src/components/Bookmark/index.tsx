import React, { SetStateAction, useState } from 'react';
import styled from 'styled-components';
import intl from 'react-intl-universal';
import { Segmented } from 'antd';
import { BookmarkType } from '@bcpros/lixi-prisma';

const StyledHeader = styled.div`
  font-weight: bold;
  text-align: left;
  font-size: 35px;
  margin: 10px 0px 10px 0px;
  font-style: italic;
`;

const StyledContainer = styled.div`
  margin: 1rem auto;
  width: 100%;
  max-width: 816px;
  text-align: left;
`;

const Bookmark = () => {
  const [bookmarkType, setBookmarkType] = useState<BookmarkType>(BookmarkType.POST);

  const segmentedOptions = [
    //Maybe need later
    // {
    //   label: 'All',
    //   value: 'all'
    // },
    {
      label: intl.get('label.post'),
      value: BookmarkType.POST
    },
    {
      label: intl.get('label.comment'),
      value: BookmarkType.COMMENT
    }
  ];

  const handleSegmentedChange = (value: string) => {
    //convert string to BookmarkType
    setBookmarkType(value as SetStateAction<BookmarkType>);
  };

  return (
    <StyledContainer>
      <StyledHeader>{intl.get('general.bookmark')}</StyledHeader>
      <Segmented options={segmentedOptions} value={bookmarkType} size="large" onChange={handleSegmentedChange} />
    </StyledContainer>
  );
};

export default Bookmark;
