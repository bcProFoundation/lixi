import { ZeroBalanceHeader } from '@bcpros/lixi-components/components/Common/Atoms';
import BalanceHeader from '@bcpros/lixi-components/components/Common/BalanceHeader';
import {
  FormItemWithQRCodeAddon,
  OpReturnMessageInput,
  SendXpiInput
} from '@bcpros/lixi-components/components/Common/EnhancedInputs';
import WalletLabel from '@bcpros/lixi-components/components/Common/WalletLabel';
import PrimaryButton from '@components/Common/PrimaryButton';
import { coinInfo, COIN } from '@bcpros/lixi-models/constants';
import { WrapperPage } from '@components/Settings';
import { WalletContext } from '@context/index';
import useXPI from '@hooks/useXPI';
import { getSelectedAccount } from '@store/account/selectors';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { sendXpiNotification } from '@store/notification/actions';
import { sendCoinFailure } from '@store/send/actions';
import { getAllWalletPaths, getSlpBalancesAndUtxos, getWalletBalances } from '@store/wallet';
import { parseAddress } from '@utils/addressMethods';
import { getDustXPI, getUtxoWif } from '@utils/cashMethods';
import { getRecipientPublicKey } from '@utils/chronik';
import { shouldRejectAmountInput } from '@utils/validation';
import { Alert, Checkbox, Col, Form, message, Modal, Row } from 'antd';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import { showToast } from '@store/toast/actions';

const StyledCheckbox = styled(Checkbox)`
  .ant-checkbox-inner {
    background-color: #fff !important;
    border: 1px solid ${props => props.theme.forms.border} !important;
  }

  .ant-checkbox-checked .ant-checkbox-inner::after {
    position: absolute;
    display: table;
    border: 2px solid ${props => props.theme.primary};
    border-top: 0;
    border-left: 0;
    transform: rotate(45deg) scale(1) translate(-50%, -50%);
    opacity: 1;
    transition: all 0.2s cubic-bezier(0.12, 0.4, 0.29, 1.46) 0.1s;
    content: ' ';
  }
`;
// Note jestBCH is only used for unit tests; BCHJS must be mocked for jest
const SendComponent: React.FC = () => {
  const dispatch = useSliceDispatch();
  const Wallet = React.useContext(WalletContext);
  const { XPI, chronik } = Wallet;
  const wallet = useSliceSelector(getSelectedAccount);
  const currentAddress = wallet?.address;

  const [formData, setFormData] = useState({
    dirty: true,
    value: '',
    address: ''
  });

  const [queryStringText, setQueryStringText] = useState(null);
  const [sendXpiAddressError, setSendXpiAddressError] = useState('');
  const [sendXpiAmountError, setSendXpiAmountError] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(coinInfo[COIN.XPI].ticker);

  // Support cashtab button from web pages
  const [txInfoFromUrl, setTxInfoFromUrl] = useState(null);

  // Show a Modal.ation modal on transactions created by populating form from web page button
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [isOpReturnMsgDisabled, setIsOpReturnMsgDisabled] = useState(true);
  const [isEncryptedOptionalOpReturnMsg, setIsEncryptedOptionalOpReturnMsg] = useState(true);
  const [opReturnMsg, setOpReturnMsg] = useState('');
  const [recipientPubKeyWarning, setRecipientPubKeyWarning] = useState('');
  const [recipientPubKeyHex, setRecipientPubKeyHex] = useState('');

  const walletBalances = useSliceSelector(getWalletBalances);
  const slpBalancesAndUtxos = useSliceSelector(getSlpBalancesAndUtxos);
  const walletPaths = useSliceSelector(getAllWalletPaths);

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const replyAddress = params.get('replyAddress');
    const isReply = params.get('isReply') === 'true';
    setFormData({
      ...formData,
      address: replyAddress ?? ''
    });
    if (replyAddress) {
      fetchRecipientPublicKey(replyAddress);
    }
  }, []);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
    submit();
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const { calcFee, sendXpi } = useXPI();

  async function submit() {
    setFormData({
      ...formData,
      dirty: false
    });

    if (!formData.address || !formData.value || Number(formData.value) <= 0) {
      return;
    }

    const { address, value } = formData;

    // Get the param-free address
    let cleanAddress = address.split('?')[0];
    const isValidAddress = XPI.Address.isXAddress(cleanAddress);
    if (!isValidAddress) {
      setSendXpiAddressError(`Destination is not a valid XPI address`);
      return;
    }
    try {
      const fundingWif = getUtxoWif(slpBalancesAndUtxos.nonSlpUtxos[0], walletPaths);

      const link = await sendXpi(
        XPI,
        chronik,
        walletPaths,
        slpBalancesAndUtxos.nonSlpUtxos,
        coinInfo[COIN.XPI].defaultFee,
        opReturnMsg,
        false, // indicate send mode is one to one
        null,
        cleanAddress,
        value,
        isEncryptedOptionalOpReturnMsg,
        fundingWif
      );
      dispatch(sendXpiNotification(link));
    } catch (e) {
      let message;
      if (!e.error && !e.message) {
        message = intl.get('send.unableSendTransaction');
      } else if (/Could not communicate with full node or other external service/.test(e.error)) {
        message = intl.get('send.communicateApi');
      } else if (
        e.error &&
        e.error.includes('too-long-mempool-chain, too many unModal.ed ancestors [limit: 50] (code 64)')
      ) {
        message = intl.get('send.manyAncestors');
      } else {
        message = e.message || e.error || JSON.stringify(e);
      }
      dispatch(sendCoinFailure(message));
    }
  }

  const fetchRecipientPublicKey = async recipientAddress => {
    let recipientPubKey: string | boolean;
    try {
      recipientPubKey = await getRecipientPublicKey(XPI, chronik, recipientAddress);
    } catch (err) {
      console.log(`SendBCH.handleAddressChange() error: ` + err);
      recipientPubKey = false;
    }
    if (recipientPubKey) {
      setRecipientPubKeyHex(recipientPubKey);
      setIsOpReturnMsgDisabled(false);
      setRecipientPubKeyWarning('');
    } else {
      setRecipientPubKeyHex('');
      setIsOpReturnMsgDisabled(true);
      setRecipientPubKeyWarning(intl.get('send.addressNoOutgoingTrans'));
    }
  };

  const handleAddressChange = e => {
    const { value, name } = e.target;
    let error: string = '';
    let addressString: string = _.trim(value);

    // parse address
    const addressInfo = parseAddress(XPI, addressString);
    const { address, isValid, queryString, amount } = addressInfo;

    // If query string,
    // Show an alert that only amount and coinInfo[COIN.XPI].ticker are supported
    setQueryStringText(queryString);

    // Is this valid address?
    if (!isValid) {
      error = intl.get('claim.invalidAddress', { ticker: coinInfo[COIN.XPI].ticker });
    }
    // Is this address same with my address?
    if (currentAddress && address && address === currentAddress) {
      error = intl.get('send.canNotSendToYourSelf');
    }
    setSendXpiAddressError(error);
    // if the address is correct
    // attempt the fetch the public key assocciated with this address
    if (error === '') {
      fetchRecipientPublicKey(address);
    }

    // Set amount if it's in the query string
    if (amount !== null) {
      // Set currency to BCHA
      setSelectedCurrency(coinInfo[COIN.XPI].ticker);

      // Use this object to mimic user input and get validation for the value
      let amountObj = {
        target: {
          name: 'value',
          value: amount
        }
      };
      handleBchAmountChange(amountObj);
      setFormData({
        ...formData,
        value: amount.toString()
      });
    }
    setFormData(p => ({
      ...p,
      address
    }));
    error = '';
  };

  const handleSelectedCurrencyChange = e => {
    setSelectedCurrency(e);
    // Clear input field to prevent accidentally sending 1 BCH instead of 1 USD
    setFormData(p => ({
      ...p,
      value: ''
    }));
  };

  const handleBchAmountChange = e => {
    const { value, name } = e.target;
    let bchValue = value;
    const error = shouldRejectAmountInput(bchValue, walletBalances.totalBalance);
    setSendXpiAmountError(error);

    setFormData(p => ({
      ...p,
      value
    }));
  };

  const onMax = async () => {
    // Clear amt error
    setSendXpiAmountError('');
    // Set currency to XPI
    setSelectedCurrency(coinInfo[COIN.XPI].ticker);
    try {
      const txFeeSats = calcFee(XPI, slpBalancesAndUtxos.nonSlpUtxos);
      const txFeeBch = txFeeSats / 10 ** coinInfo[COIN.XPI].cashDecimals;
      let value =
        _.toNumber(walletBalances.totalBalance) - txFeeBch >= 0
          ? (_.toNumber(walletBalances.totalBalance) - txFeeBch).toFixed(coinInfo[COIN.XPI].cashDecimals)
          : 0;
      value = value.toString();
      setFormData({
        ...formData,
        value
      });
    } catch (err) {
      dispatch(
        showToast('error', {
          message: intl.get('toast.error'),
          description: intl.get('send.calcMaxError')
        })
      );
    }
  };

  // Only Send Mesage Checkbox
  const sendOnlyMessageCheckbox = (
    <div className="hint" style={{ textAlign: 'right' }}>
      <span>{intl.get('send.onlyMessage')} &nbsp;</span>
      <StyledCheckbox
        defaultChecked={false}
        onChange={() =>
          setFormData({
            ...formData,
            value: getDustXPI()
          })
        }
      />
    </div>
  );

  const computeOpReturnMsgMaxByteLength = () => {
    const maxOpReturnLimit = isEncryptedOptionalOpReturnMsg
      ? coinInfo[COIN.XPI].opReturn.encryptedMsgByteLimit
      : coinInfo[COIN.XPI].opReturn.unencryptedMsgByteLimit;

    return maxOpReturnLimit;
  };

  return (
    <>
      <Modal title="Modal. Send" open={isModalVisible} onOk={handleOk} onCancel={handleCancel}>
        <p>
          {intl.get('send.sendModalTitle', {
            value: formData.value,
            ticker: coinInfo[COIN.XPI].ticker,
            address: formData.address
          })}
        </p>
      </Modal>
      <WrapperPage className="card send-component">
        {!walletBalances ? (
          <ZeroBalanceHeader>
            {intl.get('zeroBalanceHeader.noBalance', { ticker: coinInfo[COIN.XPI].ticker })}
            <br />
            {intl.get('zeroBalanceHeader.deposit')}
          </ZeroBalanceHeader>
        ) : (
          <>
            <WalletLabel name={wallet?.name ?? ''} />
            <BalanceHeader balance={walletBalances.totalBalance || 0} ticker={coinInfo[COIN.XPI].ticker} />
          </>
        )}

        {/* <Row type="flex"> */}
        <Row style={{ marginTop: '2rem' }}>
          <Col span={24}>
            <Form
              style={{
                width: 'auto'
              }}
            >
              {recipientPubKeyWarning && (
                <Alert
                  style={{
                    margin: '0 0 10px 0'
                  }}
                  message={recipientPubKeyWarning}
                  type="warning"
                  showIcon
                />
              )}
              <FormItemWithQRCodeAddon
                style={{
                  margin: '0 0 10px 0'
                }}
                loadWithCameraOpen={false}
                validateStatus={sendXpiAddressError ? 'error' : ''}
                help={sendXpiAddressError ? sendXpiAddressError : ''}
                onScan={result =>
                  handleAddressChange({
                    target: {
                      name: 'address',
                      value: result
                    }
                  })
                }
                inputProps={{
                  placeholder: `${coinInfo[COIN.XPI].ticker} Address`,
                  name: 'address',
                  onChange: e => handleAddressChange(e),
                  required: true,
                  value: formData.address
                }}
              ></FormItemWithQRCodeAddon>
              {sendOnlyMessageCheckbox}

              <SendXpiInput
                style={{
                  margin: '0 0 10px 0'
                }}
                validateStatus={sendXpiAmountError ? 'error' : ''}
                help={sendXpiAmountError ? sendXpiAmountError : ''}
                onMax={() => onMax()}
                inputProps={{
                  name: 'value',
                  dollar: selectedCurrency === 'USD' ? 1 : 0,
                  placeholder: 'Amount',
                  onChange: e => handleBchAmountChange(e),
                  required: true,
                  value: formData.value
                }}
                selectProps={{
                  value: selectedCurrency,
                  disabled: queryStringText !== null,
                  onChange: e => handleSelectedCurrencyChange(e)
                }}
                activeFiatCode={''}
              ></SendXpiInput>
              {/* OP_RETURN message */}
              <OpReturnMessageInput
                style={{
                  margin: '0 0 25px 0'
                }}
                placeholder={intl.get('send.optionalPrivateMessage')}
                disabled={isOpReturnMsgDisabled}
                value={
                  opReturnMsg
                    ? isEncryptedOptionalOpReturnMsg
                      ? opReturnMsg.substring(0, coinInfo[COIN.XPI].opReturn.encryptedMsgByteLimit)
                      : opReturnMsg
                    : ''
                }
                onChange={msg => setOpReturnMsg(msg)}
                maxByteLength={computeOpReturnMsgMaxByteLength()}
                labelTop={null}
                labelBottom={null}
              />
              {/* END OF OP_RETURN message */}
              <div>
                {!walletBalances || sendXpiAmountError || sendXpiAddressError ? (
                  <PrimaryButton>Send</PrimaryButton>
                ) : (
                  <>
                    {txInfoFromUrl ? (
                      <PrimaryButton onClick={() => showModal()}>Send</PrimaryButton>
                    ) : (
                      <PrimaryButton onClick={() => submit()}>Send</PrimaryButton>
                    )}
                  </>
                )}
              </div>
              {queryStringText && (
                <Alert
                  message={intl.get('send.queryString', { queryStringText, currency: coinInfo[COIN.XPI].ticker })}
                  type="warning"
                />
              )}
            </Form>
          </Col>
        </Row>
      </WrapperPage>
    </>
  );
};

export default SendComponent;
