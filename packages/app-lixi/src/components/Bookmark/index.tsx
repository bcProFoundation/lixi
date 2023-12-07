import React from 'react';

import BookmarkContainer from './BookmarkContainer';
import { WrapperPage } from '@components/Settings';

function BookmarkComponent() {
  return (
    <WrapperPage className="card">
      <BookmarkContainer />
    </WrapperPage>
  );
}

export default BookmarkComponent;
