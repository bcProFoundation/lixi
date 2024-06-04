import { LinkOutlined, SaveOutlined, ShareAltOutlined } from '@ant-design/icons';
import BalanceHeader from '@bcpros/lixi-components/components/Common/BalanceHeader';
import { COIN } from '@bcpros/lixi-models/constants/coins/coin';
import { coinInfo } from '@bcpros/lixi-models/constants/coins/coin-info';
import { useSliceDispatch } from '@store/index';
import { closeModal } from '@store/modal';
import { showToast } from '@store/toast/actions';
import { fromSmallestDenomination } from '@utils/cashMethods';
import { Button, Image, Modal, Popover, message } from 'antd';
import { saveAs } from 'file-saver';
import intl from 'react-intl-universal';
import {
  FacebookIcon,
  FacebookMessengerIcon,
  FacebookMessengerShareButton,
  FacebookShareButton,
  TelegramIcon,
  TelegramShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton
} from 'react-share';
import { RWebShare } from 'react-web-share';
import styled from 'styled-components';

const imageBrowserDownload = imageUri => {
  const filename = 'claim' + Date.now() + '.png';
  saveAs(imageUri, filename);
};

const ClaimButton = styled.button`
  border: none;
  color: ${props => props.theme.buttons.primary.color};
  background-image: ${props => props.theme.buttons.primary.backgroundImage};
  transition: all 0.5s ease;
  width: 35%;
  font-size: 16px;
  background-size: 200% auto;
  padding: 10px 0;
  border-radius: 4px;
  margin-bottom: 20px;
  cursor: pointer;
  :hover {
    background-position: right center;
    -webkit-box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
    -moz-box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
    box-shadow: ${props => props.theme.buttons.primary.hoverShadow};
  }
  svg {
    fill: ${props => props.theme.buttons.primary.color};
  }
  @media (max-width: 768px) {
    font-size: 16px;
    padding: 10px 5px;
  }
`;

const SocialSharePanel = ({ shareUrl }) => {
  const dispatch = useSliceDispatch();

  const title = 'Lixi Program sent you a small gift!';
  return (
    <div>
      <div className="socialshare-network">
        <FacebookShareButton url={shareUrl} className="socialshare-button">
          <FacebookIcon size={32} round />
        </FacebookShareButton>
      </div>

      <div className="socialshare-network">
        <FacebookMessengerShareButton url={shareUrl} appId="521270401588372" className="socialshare-button">
          <FacebookMessengerIcon size={32} round />
        </FacebookMessengerShareButton>
      </div>

      <div className="socialshare-network">
        <TwitterShareButton url={shareUrl} title={title} className="socialshare">
          <TwitterIcon size={32} round />
        </TwitterShareButton>
      </div>

      <div className="socialshare-network">
        <TelegramShareButton url={shareUrl} title={title} className="socialshare-button">
          <TelegramIcon size={32} round />
        </TelegramShareButton>
      </div>

      <div className="socialshare-network">
        <WhatsappShareButton url={shareUrl} title={title} separator=":: " className="socialshare-button">
          <WhatsappIcon size={32} round />
        </WhatsappShareButton>
      </div>
      <div className="socialshare-network">
        <Button
          type="primary"
          shape="circle"
          icon={<LinkOutlined style={{ color: 'white', fontSize: '20px' }} />}
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            dispatch(
              showToast('info', {
                message: intl.get('toast.info'),
                description: intl.get('claim.copyToClipboard')
              })
            );
          }}
        />
      </div>
    </div>
  );
};

const StyledSocialSharePanel = styled(SocialSharePanel)`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  .socialshare-network {
    padding: 10px 4px;
  }
`;

const popOverContent = shareUrl => {
  return <StyledSocialSharePanel shareUrl={shareUrl} />;
};

const LixiEnvelopeViewModal = ({ lixiClaimed, envelopeUrl, shareUrl }) => {
  const dispatch = useSliceDispatch();

  const ShareSocialButton = (
    <RWebShare
      data={{
        text: 'Lixi Program sent you a small gift!',
        url: shareUrl,
        title: 'Flamingos'
      }}
      onClick={() => console.log('shared successfully!')}
    >
      <ClaimButton>
        <ShareAltOutlined /> Share
      </ClaimButton>
    </RWebShare>
  );

  const ShareSocialDropdown = (
    <Popover content={() => popOverContent(shareUrl)}>
      <ClaimButton>
        <ShareAltOutlined /> Share
      </ClaimButton>
    </Popover>
  );

  const handleOnCopyLink = () => {
    message.info(intl.get('claim.copyToClipboard'));
  };

  const handleOnCancel = () => {
    dispatch(closeModal());
  };

  return (
    <Modal
      title={intl.get('claim.titleShared')}
      open={true}
      onCancel={handleOnCancel}
      getContainer={false}
      footer={null}
      maskClosable={false}
    >
      {lixiClaimed && (
        <BalanceHeader balance={fromSmallestDenomination(lixiClaimed.amount)} ticker={coinInfo[COIN.XPI].ticker} />
      )}
      {envelopeUrl && <Image src={envelopeUrl} />}
      {lixiClaimed && lixiClaimed.message && <div>{lixiClaimed.message}</div>}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          paddingTop: '20px'
        }}
      >
        <ClaimButton onClick={() => imageBrowserDownload(envelopeUrl)}>
          <SaveOutlined /> Save
        </ClaimButton>
        {window.innerWidth < 761 ? ShareSocialButton : ShareSocialDropdown}
      </div>
    </Modal>
  );
};

const Container = styled(LixiEnvelopeViewModal)`
  top: 0 !important;
  .ant-modal,
  .ant-modal-content {
    height: 100vh !important;
    top: 0 !important;
  }
  .ant-modal-body {
    height: calc(100vh - 110px) !important;
  }
`;

export default Container;
