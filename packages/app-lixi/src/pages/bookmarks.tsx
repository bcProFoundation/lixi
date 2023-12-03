import React from 'react';

import BookmarkComponent from '../components/Bookmark';
import DeviceProtectableComponentWrapper from '@components/Authentication/DeviceProtectableComponentWrapper';

const BookmarkPage = () => {
  return (
    <DeviceProtectableComponentWrapper>
      <BookmarkComponent />
    </DeviceProtectableComponentWrapper>
  );
};

export default BookmarkPage;
