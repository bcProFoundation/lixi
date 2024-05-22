import { CopyOutlined, ImportOutlined, LockOutlined, PlusSquareOutlined, WalletOutlined } from '@ant-design/icons';
import Edit from '@assets/icons/edit.svg';
import Trashcan from '@assets/icons/trashcan.svg';
import {
  CashLoadingIcon,
  ThemedQuerstionCircleOutlinedFaded
} from '@bcpros/lixi-components/components/Common/CustomIcons';
import {
  Account,
  DeleteAccountCommand,
  RenameAccountCommand,
  SecondaryLanguageAccountCommand
} from '@bcpros/lixi-models';
import { COIN } from '@bcpros/lixi-models/constants';
import {
  AntdFormWrapper,
  LanguageNotAutoTransDropdown,
  LanguageSelectDropdown
} from '@components/Common/EnhancedInputs';
import PrimaryButton, { SecondaryButton, SmartButton } from '@components/Common/PrimaryButton';
import { StyledCollapse } from '@components/Common/StyledCollapse';
import { WalletContext } from '@context/index';
import {
  deleteAccount,
  importAccount,
  renameAccount,
  selectAccount,
  setAccountCoin,
  setSecondaryLanguageAccount
} from '@store/account/actions';
import { getAllAccounts, getSelectedAccount } from '@store/account/selectors';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { getIsGlobalLoading } from '@store/loading/selectors';
import { openModal } from '@store/modal/actions';
import { setCurrentThemes, setInitIntlStatus, setIsSystemThemes, updateLanguage } from '@store/settings/actions';
import { getCurrentLocale, getCurrentThemes, getIsSystemThemes } from '@store/settings/selectors';
import { Alert, Button, Collapse, Form, Input, Modal, Select, Spin } from 'antd';
import axios from 'axios';
import * as _ from 'lodash';
import React, { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';
import { DeleteAccountModalProps } from './DeleteAccountModal';
import LockAppSetting from './LockAppSetting';
import PushNotificationSetting from './PushNotificationSetting';
import { RenameAccountModalProps } from './RenameAccountModal';
import useThemeDetector from '@local-hooks/useThemeDetector';
import { showToast } from '@store/toast/actions';
import { activateWallet } from '@store/wallet';

const { Panel } = Collapse;

export const ThemedCopyOutlined = styled(CopyOutlined)`
  color: ${props => props.theme.icons.outlined} !important;
`;

export const ThemedWalletOutlined = styled(WalletOutlined)`
  color: ${props => props.theme.icons.outlined} !important;
`;

const SWRow = styled.div`
  border-radius: 3px;
  padding: 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  @media (max-width: 500px) {
    flex-direction: column;
    margin-bottom: 12px;
  }
`;

const SWName = styled.div`
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  word-wrap: break-word;
  hyphens: auto;

  @media (max-width: 500px) {
    width: 100%;
    justify-content: center;
    margin-bottom: 15px;
  }

  h3 {
    font-size: 14px;
    color: ${props => props.theme.wallet.text.secondary};
    margin: 0;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const SWButtonCtn = styled.div`
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  button {
    min-width: 100px;
  }
  @media (max-width: 500px) {
    width: 100%;
    justify-content: center;
  }

  button {
    cursor: pointer;

    @media (max-width: 768px) {
      font-size: 14px;
    }
  }

  svg {
    stroke: ${props => props.theme.wallet.text.secondary};
    fill: ${props => props.theme.wallet.text.secondary};
    width: 25px;
    height: 25px;
    margin-right: 20px;
    cursor: pointer;

    :first-child:hover {
      stroke: ${props => props.theme.primary};
      fill: ${props => props.theme.primary};
    }
    :hover {
      stroke: ${props => props.theme.settings.delete};
      fill: ${props => props.theme.settings.delete};
    }
  }
`;

const AWRow = styled.div`
  padding: 10px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  h3 {
    font-size: 14px;
    display: inline-block;
    color: ${props => props.theme.wallet.text.secondary};
    margin: 0;
    text-align: left;
    font-weight: bold;
    @media (max-width: 500px) {
      font-size: 14px;
    }
  }
  h4 {
    font-size: 14px;
    display: inline-block;
    color: ${props => props.theme.primary} !important;
    margin: 0;
    text-align: right;
  }
  @media (max-width: 500px) {
    flex-direction: column;
    margin-bottom: 12px;
  }
`;

export const WrapperPage = styled.div`
  width: 100%;
  max-width: 816px;
  margin: 1rem auto;
  padding: 1rem;
  background: #fff;
  border-radius: var(--border-radius-primary);
  border: 1px solid var(--border-item-light);
  height: max-content;
  display: block;
  @media (max-width: 768px) {
    padding: 1rem;
    padding-bottom: 3rem;
  }
  .ant-alert-with-description {
    padding: 1rem;
    align-items: center;
    font-size: 13px;
  }
`;

export const WrapperPost = styled.div`
  padding: 1rem;
  background: #fff;
  border-radius: var(--border-radius-primary);
`;

const SettingBar = styled.div`
  padding: 1rem;
  border: 1px solid rgba(128, 116, 124, 0.12);
  border-radius: var(--border-radius-primary);
  margin-bottom: 2rem;
  h2 {
    text-align: left;
  }
  &.language-bar {
    margin-top: 2rem;
  }
  .ant-collapse-content {
    border: none;
  }
  @media (min-width: 960px) {
    .notranslate {
      font-weight: 500;
      color: transparent !important;
      text-shadow: 0 0 5px rgb(0 0 0 / 50%);
      &:hover {
        color: var(--color-primary) !important;
        text-shadow: none;
      }
    }
  }
  @media (max-width: 960px) {
    .notranslate {
      font-weight: 500;
      color: var(--color-primary) !important;
    }
  }
  .second-language {
    margin-top: 2rem;
  }
`;

const helpInfoIcon = (
  <ThemedQuerstionCircleOutlinedFaded
    onClick={() => {
      Modal.info({
        centered: true,
        okText: intl.get('settings.gotIt'),
        title: intl.get('settings.howEnableNotification'),
        maskClosable: true,
        content: (
          <div>
            <p>{intl.get('settings.deviceSupport')}</p>
            <p>{intl.get('settings.notSupportIos')}</p>
            <div className="heading">{intl.get('settings.twoStepEnableNotification')}</div>
            <ul>
              <li>
                {intl.get('settings.allowNotification')}
                <em>{intl.get('settings.forBrowser')}</em>.
              </li>
              <li>
                {intl.get('settings.thenAllowNotification')}
                <em>{intl.get('settings.sendlotusOnBrower')}</em>.
              </li>
            </ul>
          </div>
        )
      });
    }}
  />
);

const Settings: React.FC = () => {
  const Wallet = React.useContext(WalletContext);

  const isLoading = useSliceSelector(getIsGlobalLoading);
  const [seedInput, openSeedInput] = useState(false);
  const [isValidMnemonic, setIsValidMnemonic] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    dirty: true,
    mnemonic: ''
  });

  const [form] = Form.useForm();
  const [otherAccounts, setOtherAccounts] = useState<Account[]>([]);

  const dispatch = useSliceDispatch();
  const savedAccounts: Account[] = useSliceSelector(getAllAccounts);
  const selectedAccount: Account | undefined = useSliceSelector(getSelectedAccount);
  const currentThemes = useSliceSelector(getCurrentThemes);
  const currentDeviceTheme = useThemeDetector();
  const isSystemThemes = useSliceSelector(getIsSystemThemes);
  const currentLocale = useSliceSelector(getCurrentLocale);

  const keyCoins = Object.keys(COIN);
  const labelCoin = item => (
    <div className="label-coin">
      <img className="img-coin" src={`/images/currencies/${item?.toLowerCase()}.svg`} />
      <span className="name-coin">{item}</span>
    </div>
  );
  const labelOptionCoins = keyCoins.map(item => {
    return { label: labelCoin(item), value: item };
  });

  useEffect(() => {
    if (isSystemThemes) {
      dispatch(setCurrentThemes(currentDeviceTheme ? 'dark' : 'light'));
    }
  }, [currentDeviceTheme, currentThemes]);

  useEffect(() => {
    setOtherAccounts(_.filter(savedAccounts, acc => acc.id !== selectedAccount?.id));
  }, [savedAccounts]);

  useEffect(() => {
    if (otherAccounts.length <= 0 && !selectedAccount) {
      localLogout();
    }
  }, [otherAccounts, selectedAccount]);

  const localLogout = async () => {
    const url = '/_api/local-logout';
    await axios.post(url);
  };

  const showPopulatedRenameAccountModal = (account: Account) => {
    const command: RenameAccountCommand = {
      id: account.id,
      mnemonic: account.mnemonic,
      name: account.name
    };
    const renameAcountModalProps: RenameAccountModalProps = {
      account: account,
      onOkAction: renameAccount(command)
    };
    dispatch(openModal('RenameAccountModal', renameAcountModalProps));
  };

  const showPopulatedDeleteAccountModal = (account: Account) => {
    const command: DeleteAccountCommand = {
      id: account.id,
      mnemonic: account.mnemonic
    };
    const deleteAcountModalProps: DeleteAccountModalProps = {
      account: account,
      remainingAccounts: account == selectedAccount ? otherAccounts : [],
      onOkAction: deleteAccount(command)
    };
    dispatch(openModal('DeleteAccountModal', deleteAcountModalProps));
  };

  const showPopulatedCreateAccountModal = () => {
    dispatch(openModal('CreateAccountModal', null));
  };

  const handleChange = e => {
    const { value, name } = e.target;

    // Validate mnemonic on change
    // Import button should be disabled unless mnemonic is valid
    setIsValidMnemonic(Wallet.validateMnemonic(value));

    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleChangeThemes = selectTheme => {
    const currentThemesSelect = selectTheme;
    dispatch(setCurrentThemes(currentThemesSelect));
    selectTheme === 'system' ? dispatch(setIsSystemThemes(true)) : dispatch(setIsSystemThemes(false));
  };

  function setLanguage(language: string) {
    dispatch(setInitIntlStatus(false));
    dispatch(updateLanguage(language));
  }

  async function submit() {
    setFormData({
      ...formData,
      dirty: false
    });

    // Exit if no user input
    if (!formData.mnemonic) {
      return;
    }

    // Exit if mnemonic is invalid
    if (!isValidMnemonic) {
      return;
    }

    dispatch(importAccount(formData.mnemonic));

    form.setFieldsValue({
      mnemonic: ''
    });
  }

  const handleChangeWallet = value => {
    dispatch(activateWallet({ mnemonic: selectedAccount.mnemonic, coin: value }));
    dispatch(setAccountCoin({ id: selectedAccount.id, accountCoin: value }));
  };

  const itemRevealPhrase = [
    {
      key: '1',
      label: intl.get('settings.revealPhrase'),
      children: (
        <p className="notranslate">{selectedAccount && selectedAccount.mnemonic ? selectedAccount.mnemonic : ''}</p>
      )
    }
  ];

  const itemsSavedAccount = [
    {
      key: '2',
      label: intl.get('settings.savedAccount'),
      children: (
        <React.Fragment>
          <AWRow>
            <SWName>
              <h3>{selectedAccount?.name}</h3>
            </SWName>
            <SWName>
              <h3>
                {
                  <Select
                    onChange={handleChangeWallet}
                    defaultValue={selectedAccount?.coin ?? COIN.XPI}
                    options={labelOptionCoins}
                    // bordered={null}
                    variant="borderless"
                    style={{ left: '-11px' }}
                  ></Select>
                }
              </h3>
            </SWName>
            <SWButtonCtn>
              <span onClick={() => showPopulatedRenameAccountModal(selectedAccount as Account)}>
                <Edit />
              </span>
              <span onClick={() => showPopulatedDeleteAccountModal(selectedAccount as Account)}>
                <Trashcan />
              </span>
              <Button disabled={true} type="primary" className="no-border-btn">
                {intl.get('settings.activated')}
              </Button>
            </SWButtonCtn>
          </AWRow>

          <div>
            {otherAccounts &&
              otherAccounts.map(acc => (
                <SWRow key={acc.id}>
                  <SWName>
                    <h3>{acc.name}</h3>
                  </SWName>
                  <SWName>
                    <h3>{labelCoin(acc.coin)}</h3>
                  </SWName>

                  <SWButtonCtn>
                    <span onClick={() => showPopulatedRenameAccountModal(acc)}>
                      <Edit />
                    </span>
                    <span onClick={() => showPopulatedDeleteAccountModal(acc)}>
                      <Trashcan />
                    </span>
                    <Button type="primary" className="outline-btn" onClick={() => dispatch(selectAccount(acc.id))}>
                      Activate
                    </Button>
                  </SWButtonCtn>
                </SWRow>
              ))}
          </div>
        </React.Fragment>
      )
    }
  ];

  return (
    <>
      <WrapperPage className="card setting-page">
        <Spin spinning={isLoading} indicator={CashLoadingIcon}>
          <SettingBar>
            <h2 style={{ color: 'var(--color-primary)' }}>{intl.get('settings.backupAccount')}</h2>
            <Alert
              style={{ marginBottom: '12px' }}
              description={intl.get('settings.backupAccountWarning')}
              type="warning"
              showIcon
              message
            />
            <StyledCollapse items={itemRevealPhrase}></StyledCollapse>
          </SettingBar>
          <SettingBar>
            <h2 style={{ color: 'var(--color-primary)' }}>{intl.get('settings.manageAccounts')}</h2>
            <PrimaryButton onClick={() => showPopulatedCreateAccountModal()}>
              <PlusSquareOutlined /> {intl.get('settings.newAccount')}
            </PrimaryButton>
            <SecondaryButton onClick={() => openSeedInput(!seedInput)}>
              <ImportOutlined /> {intl.get('settings.importAccount')}
            </SecondaryButton>
            {seedInput && (
              <>
                <p>{intl.get('settings.backupAccountHint')}</p>
                <AntdFormWrapper>
                  <Form style={{ width: 'auto' }} form={form}>
                    <Form.Item
                      name="mnemonic"
                      validateStatus={isValidMnemonic === null || isValidMnemonic ? '' : 'error'}
                      help={isValidMnemonic === null || isValidMnemonic ? '' : intl.get('account.mnemonicRequired')}
                    >
                      <Input
                        prefix={<LockOutlined />}
                        placeholder={intl.get('account.mnemonic')}
                        name="mnemonic"
                        autoComplete="off"
                        onChange={e => handleChange(e)}
                      />
                    </Form.Item>
                    <SmartButton disabled={!isValidMnemonic} onClick={() => submit()}>
                      Import
                    </SmartButton>
                  </Form>
                </AntdFormWrapper>
              </>
            )}

            {(selectedAccount || (otherAccounts && otherAccounts.length > 0)) && (
              <>
                <StyledCollapse>
                  <Panel header={intl.get('settings.savedAccount')} key="2">
                    {
                      <AWRow>
                        <SWName>
                          <h3>{selectedAccount?.name}</h3>
                        </SWName>
                        {/* <SWName>
                          <h3>
                            {
                              <Select
                                onChange={handleChangeWallet}
                                defaultValue={selectedAccount?.coin ?? COIN.XPI}
                                options={labelOptionCoins}
                                bordered={null}
                                style={{ left: '-11px' }}
                              ></Select>
                            }
                          </h3>
                        </SWName> */}
                        <SWButtonCtn>
                          <span onClick={() => showPopulatedRenameAccountModal(selectedAccount as Account)}>
                            <Edit />
                          </span>
                          <span onClick={() => showPopulatedDeleteAccountModal(selectedAccount as Account)}>
                            <Trashcan />
                          </span>
                          <Button disabled={true} type="primary" className="no-border-btn">
                            {intl.get('settings.activated')}
                          </Button>
                        </SWButtonCtn>
                      </AWRow>
                    }
                    <div>
                      {otherAccounts &&
                        otherAccounts.map(acc => (
                          <SWRow key={acc.id}>
                            <SWName>
                              <h3>{acc.name}</h3>
                            </SWName>
                            {/* <SWName>
                              <h3>{labelCoin(acc.coin)}</h3>
                            </SWName> */}

                            <SWButtonCtn>
                              <span onClick={() => showPopulatedRenameAccountModal(acc)}>
                                <Edit />
                              </span>
                              <span onClick={() => showPopulatedDeleteAccountModal(acc)}>
                                <Trashcan />
                              </span>
                              <Button
                                type="primary"
                                className="outline-btn"
                                onClick={() => dispatch(selectAccount(acc.id))}
                              >
                                Activate
                              </Button>
                            </SWButtonCtn>
                          </SWRow>
                        ))}
                    </div>
                  </Panel>
                </StyledCollapse>
                {/* TODO: Implement in the future */}
                {/* <Button href={getOauth2URL()}>Login</Button> */}
              </>
            )}
          </SettingBar>
          <SettingBar className="language-bar">
            <h2 style={{ color: 'var(--color-primary)' }}>{intl.get('settings.primaryLanguage')}</h2>
            <AntdFormWrapper>
              <LanguageSelectDropdown
                defaultValue={selectedAccount?.language}
                onChange={(language: string) => {
                  setLanguage(language);
                }}
              />
            </AntdFormWrapper>

            <div className="second-language">
              <h2 style={{ color: 'var(--color-primary)' }}>{intl.get('settings.secondLanguage')}</h2>
              <AntdFormWrapper>
                <LanguageNotAutoTransDropdown
                  defaultValue={selectedAccount?.secondaryLanguage}
                  onChange={(locale: any) => {
                    const secondaryLanguageAccountCommand: SecondaryLanguageAccountCommand = {
                      id: selectedAccount?.id,
                      mnemonic: selectedAccount?.mnemonic,
                      secondaryLanguage: locale
                    };
                    dispatch(setSecondaryLanguageAccount(secondaryLanguageAccountCommand));
                  }}
                />
              </AntdFormWrapper>
            </div>
          </SettingBar>
          <SettingBar className="themes-bar">
            <h2 style={{ color: 'var(--color-primary)' }}>{intl.get('settings.themes')}</h2>
            <AntdFormWrapper>
              <Select
                defaultValue={isSystemThemes ? 'system' : currentThemes}
                style={{ width: '100%' }}
                onChange={handleChangeThemes}
                options={[
                  {
                    value: 'light',
                    label: 'Light'
                  },
                  {
                    value: 'dark',
                    label: 'Dark'
                  },
                  {
                    value: 'system',
                    label: 'System Default'
                  }
                ]}
              />
            </AntdFormWrapper>
          </SettingBar>
          <SettingBar>
            <h2 style={{ color: 'var(--color-primary)' }}>{intl.get('settings.notifications')}</h2>
            <PushNotificationSetting />
          </SettingBar>
          <SettingBar>
            <h2 style={{ color: 'var(--color-primary)' }}>{intl.get('settings.lockApp')}</h2>
            <LockAppSetting />
          </SettingBar>
        </Spin>
      </WrapperPage>
    </>
  );
};

export default Settings;
