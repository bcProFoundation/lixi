import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { showToast } from '@store/toast/actions';
import { useSliceDispatch } from '@store/index';
import intl from 'react-intl-universal';

const CallbackComponent = props => {
  const { statusCode } = props;
  const router = useRouter();
  const dispatch = useSliceDispatch();

  useEffect(() => {
    if (statusCode && statusCode == 200) {
      dispatch(
        showToast('success', {
          message: intl.get('toast.success'),
          description: intl.get('account.loginSuccess'),
          duration: 5
        })
      );
      router.push('/');
    }
  }, []);
  return (
    <>
      {statusCode != 200 && (
        <>
          <h1>Login failed</h1>
        </>
      )}
    </>
  );
};

export default CallbackComponent;
