import { useSliceDispatch } from '@store/index';
import { openModal } from '@store/modal/actions';
import { AuthorizationOptions } from './Authorization.interface';

export type HanldeAuthorization = (options?: AuthorizationOptions) => void;
const useAuthorization = () => {
  const dispatch = useSliceDispatch();
  return (options?: AuthorizationOptions) => {
    dispatch(openModal('AuthorizationModal', { options: options }));
  };
};

export default useAuthorization;
