import React from 'react';
import LixiList from '@components/Lixi/LixiList';
import { getLixiesBySelectedAccount } from '@store/lixi/selectors';
import { useSliceSelector } from '@store/index';

const LixiesPage = () => {
  const lixies = useSliceSelector(getLixiesBySelectedAccount);
  return <LixiList lixies={lixies} />;
};

export default LixiesPage;
