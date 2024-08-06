import { useSliceSelector } from '@store/index';
import { getModals } from '@store/modal/selectors';

import { RenameAccountModal } from '../Settings/RenameAccountModal';
import { RenameLixiModal } from '../Lixi/RenameLixiModal';
import { DeleteAccountModal } from '../Settings/DeleteAccountModal';
import { CreateLixiConfirmationModal } from '../Lixi/CreateLixiConfirmationModal';
import { CreateLixiFormModal } from '../Lixi/CreateLixiFormModal';
import { QRCodeModalPopup } from './QRCodeModalPopup';
import { EditPostModalPopup } from '../Posts/EditPostModalPopup';
import { CreatePageModal } from '@components/Pages/CreatePageModal';
import { EditPageModal } from '@components/Pages/EditPageModal';
import { UploadAvatarCoverModal } from './uploadImageModal';
import { BurnModal } from './BurnModal';
import { ConfigProvider } from 'antd';
import lightTheme from 'src/styles/themes/lightTheme';
import { FollowModal } from './FollowModal';
import { CreateProductModal } from '@components/Product/CreateProductModal';
import { EditProductModal } from '@components/Product/EditProductModal';
import { PostDetailModal } from '../Posts/PostDetailModal';
import { AuthorizationModal } from './Authorization/AuthorizationModal';
import PageMessageLixiModal from '@components/PageMessage/PageMessageLixiModal';
import { getCurrentThemes } from '@store/settings';
import darkTheme from 'src/styles/themes/darkTheme';
import { EditProfileModal } from './EditProfileModal';
import LixiEnvelopeViewModal from '@components/Lixi/LixiEnvelopeViewModal';
import CreateAccountModal from '@components/Account/CreateAccountModal';
import BurnHistoryModal from './BurnHistoryModal';
import WalletHistoryModal from './WalletHistoryModal';

const modalComponentLookupTable = {
  CreateLixiConfirmationModal,
  RenameAccountModal,
  DeleteAccountModal,
  RenameLixiModal,
  CreateLixiFormModal,
  QRCodeModalPopup,
  EditPostModalPopup,
  CreateProductModal,
  CreatePageModal,
  EditProductModal,
  EditPageModal,
  UploadAvatarCoverModal,
  BurnModal,
  FollowModal,
  PostDetailModal,
  AuthorizationModal,
  PageMessageLixiModal,
  EditProfileModal,
  LixiEnvelopeViewModal,
  CreateAccountModal,
  BurnHistoryModal,
  WalletHistoryModal
};

const ModalManager = () => {
  const currentModals = useSliceSelector(getModals);
  const currentTheme = useSliceSelector(getCurrentThemes);
  const renderedModals = currentModals.map((modalDescription, index) => {
    const { modalType, modalProps = {} } = modalDescription;
    let newModalProps = { ...modalProps };
    newModalProps.classStyle = currentTheme === 'dark' ? 'ant-modal-dark' : '';
    const ModalComponent = modalComponentLookupTable[modalType];

    return (
      <ConfigProvider theme={currentTheme === 'dark' ? darkTheme : lightTheme} key={modalType + index}>
        <ModalComponent {...newModalProps} />
      </ConfigProvider>
    );
  });

  return <span>{renderedModals}</span>;
};

export default ModalManager;
