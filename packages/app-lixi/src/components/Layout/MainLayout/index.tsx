import { LoadingOutlined } from '@ant-design/icons';
import { getGraphqlRequestStatus, getSelectedAccount } from '@store/account/selectors';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { App, ConfigProvider, Layout, Spin } from 'antd';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { DefaultTheme, ThemeProvider } from 'styled-components';

import ToastNotificationManage from '@components/Common/ToastNotificationManage';
import Footer from '@components/Footer/Footer';
import Sidebar from '@containers/Sidebar';
import DummySidebar from '@containers/Sidebar/DummySidebar';
import SidebarRanking from '@containers/Sidebar/SideBarRanking';
import SidebarShortcut from '@containers/Sidebar/SideBarShortcut';
import Topbar from '@containers/Topbar';
import useDetectMobileView from '@local-hooks/useDetectMobileView';
import useThemeDetector from '@local-hooks/useThemeDetector';
import { setTransactionReady } from '@store/account/actions';
import { getCurrentPageMessageSession } from '@store/page/selectors';
import { setShowCreatePost } from '@store/post/actions';
import { setCurrentThemes } from '@store/settings/actions';
import { getCurrentLocale, getCurrentThemes, getIntlInitStatus, getIsSystemThemes } from '@store/settings/selectors';
import { getSlpBalancesAndUtxos } from '@store/wallet';
import 'animate.css';
import { Header } from 'antd/lib/layout/layout';
import darkTheme from 'src/styles/themes/darkTheme';
import lightTheme from 'src/styles/themes/lightTheme';
import { injectStore } from 'src/utils/axiosClient';
import ActionSheet from '../../Common/ActionSheet';
import ModalManager from '../../Common/ModalManager';
import { GlobalStyle } from './GlobalStyle';
import { theme } from './theme';
import ClaimComponent from '@components/Claim';

export const LoadingIcon = <LoadingOutlined className="loadingIcon" />;

const LixiApp = styled.div`
  text-align: center;
  background-color: ${props => props.theme.app.background};
`;

const AppBody = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background-attachment: fixed;
  flex-direction: column;
`;

export const NavBarHeader = styled(Header)`
  background: transparent !important;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 1rem 0;
  background: transparent;
  border-bottom: 0.5px solid gray;
  margin-bottom: 10px;
  .anticon {
    font-size: 10px;
    color: rgba(30, 26, 29, 0.6);
  }
  .anticon-left {
    font-size: 18px;
  }
  @media (max-width: 960px) {
    width: 100%;
    padding: 8px;
  }
`;

export const PathDirection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-left: 1rem;
  h2 {
    font-size: 24px;
    margin: 0;
    text-transform: capitalize;
    color: #1e1a1d;
  }
  .sub-title {
    text-transform: capitalize;
  }
`;

export const AppContainer = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
  background: ${props => props.theme.wallet.background};
  .ant-layout.ant-layout-has-sider {
    display: flex;
    justify-content: space-between;
  }
  .container-content {
    height: 100vh;
    scroll-behavior: smooth;
    overflow-y: auto;
    flex-grow: 1;
    display: flex;
    flex-direction: row;
    gap: 1rem;
    justify-content: flex-start;
    @media (max-width: 960px) {
      height: auto;
      margin-left: 0 !important;
      padding: 0 8px;
      -ms-overflow-style: none; // Internet Explorer 10+
      scrollbar-width: none; // Firefox
      ::-webkit-scrollbar {
        display: none; // Safari and Chrome
      }
    }

    @media (min-width: 960px) {
      ::-webkit-scrollbar {
        -webkit-appearance: none;
        width: 7px;
      }

      ::-webkit-scrollbar-thumb {
        border-radius: 4px;
        background-color: rgba(0, 0, 0, 0.5);
        box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
      }
    }

    .content-child {
      width: 100%;
      margin: 0 auto;
      height: fit-content;
      margin-bottom: 4rem;
      @media (max-width: 968px) {
        margin-bottom: 0;
        height: 100vh;
      }
      @media (max-width: 526px) {
        > div:not(.page-message) {
          padding-bottom: 3rem;
        }
      }
    }
  }
  .ant-drawer {
    .ant-drawer-body {
      -ms-overflow-style: none; // Internet Explorer 10+
      scrollbar-width: none; // Firefox
      ::-webkit-scrollbar {
        display: none; // Safari and Chrome
      }
    }
    @media (min-width: 960px) {
      position: inherit;
    }
  }
  .sidebar-mobile {
    .ant-drawer-body {
      padding: 0 !important;
      .wrapper {
        padding: 0.5rem;
      }
    }
  }
  @media (max-width: 960px) {
    height: auto;
    min-height: auto;
  }

  .wrap-claim-component {
    width: 250px;
    margin-top: 3.1rem;

    @media (max-width: 960px) {
      display: none;
    }
  }
`;

export const HeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start !important;
  width: 100%;
  padding: 10px 0 15px;
  justify-content: space-between;
  border-bottom: 1px solid ${props => props.theme.wallet.borders.color};

  a {
    color: ${props => props.theme.wallet.text.secondary};

    :hover {
      color: ${props => props.theme.primary};
    }
  }

  @media (max-width: 960px) {
    a {
      font-size: 12px;
    }
    padding: 1rem 0 1rem;
  }
`;

export const LotusLogo = styled.img`
  width: 70px;
  @media (max-width: 960px) {
    width: 50px;
  }
`;

export const LixiTextLogo = styled.img`
  width: 250px;
  margin-left: 40px;
  @media (max-width: 960px) {
    width: 190px;
    margin-left: 20px;
  }
`;

type MainLayoutProps = React.PropsWithChildren<{}>;

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const currentLocale = useSliceSelector(getCurrentLocale);
  const dispatch = useSliceDispatch();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const selectedKey = router.pathname ?? '';
  const slpBalancesAndUtxos = useSliceSelector(getSlpBalancesAndUtxos);
  const slpBalancesAndUtxosRef = useRef(slpBalancesAndUtxos);
  const scrollRef = useRef(null);
  const graphqlRequestLoading = useSliceSelector(getGraphqlRequestStatus);
  const currentTheme = useSliceSelector(getCurrentThemes);
  const isMobile = useDetectMobileView();
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const currentDeviceTheme = useThemeDetector();
  const isSystemThemes = useSliceSelector(getIsSystemThemes);
  const currentPageMessageSession = useSliceSelector(getCurrentPageMessageSession);

  useEffect(() => {
    if (isSystemThemes) {
      dispatch(setCurrentThemes(currentDeviceTheme ? 'dark' : 'light'));
    }
  }, [currentDeviceTheme, currentTheme]);

  useEffect(() => {
    if (slpBalancesAndUtxos === slpBalancesAndUtxosRef.current) return;
    dispatch(setTransactionReady());
  }, [slpBalancesAndUtxos.nonSlpUtxos]);

  useEffect(() => {
    if (graphqlRequestLoading) {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
  }, [graphqlRequestLoading]);

  injectStore(currentLocale);

  useEffect(() => {
    setLoading(false);
  }, [selectedAccount]);

  const handleScroll = e => {
    if (isMobile) {
      const currentScrollPos = e?.currentTarget?.scrollTop;
      setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 20);
      dispatch(setShowCreatePost(visible));
      setPrevScrollPos(currentScrollPos);
    }
  };

  const hideStatusBar = useMemo(() => {
    return selectedKey === '/page-message' && currentPageMessageSession && isMobile;
  }, [selectedKey, currentPageMessageSession]);

  return (
    <ConfigProvider theme={currentTheme === 'dark' ? darkTheme : lightTheme}>
      <App>
        <ThemeProvider theme={theme as DefaultTheme}>
          <GlobalStyle />
          <Spin spinning={loading} indicator={LoadingIcon}>
            <LixiApp className={currentTheme === 'dark' ? 'dark' : ''}>
              <Layout>
                <AppBody>
                  <ModalManager />
                  <AppContainer className="app-container">
                    <Sidebar className="sidebar-mobile" />
                    {!hideStatusBar && (
                      <Topbar
                        className={`animate__animated animate__faster ${
                          isMobile && selectedKey === '/'
                            ? visible
                              ? 'animate__fadeInDown'
                              : 'animate__fadeOutUp'
                            : ''
                        }`}
                      />
                    )}
                    <div
                      className="container-content"
                      style={{ padding: selectedKey === '/page-message' ? '0' : '' }}
                      id="scrollableDiv"
                      ref={scrollRef}
                      onScroll={e => handleScroll(e)}
                    >
                      <SidebarShortcut />
                      <div className="content-child" style={{ paddingTop: isMobile && !hideStatusBar ? 64 : 0 }}>
                        {children}
                      </div>
                      {/* This below is just a dummy sidebar */}
                      {(selectedKey === '/wallet' || selectedKey === '/') && (
                        <div>
                          <div className="wrap-claim-component">
                            <ClaimComponent isClaimFromAccount={true} claimCodeFromURL={''}></ClaimComponent>{' '}
                          </div>
                          <SidebarRanking></SidebarRanking>
                        </div>
                      )}
                      <DummySidebar />
                      {!hideStatusBar && (
                        <Footer
                          classList={`animate__animated animate__faster ${
                            isMobile && selectedKey === '/'
                              ? visible
                                ? 'animate__fadeInUp'
                                : 'animate__fadeOutDown'
                              : ''
                          }`}
                        />
                      )}
                    </div>
                  </AppContainer>
                  <ActionSheet />
                  <ToastNotificationManage />
                </AppBody>
              </Layout>
            </LixiApp>
          </Spin>
        </ThemeProvider>
      </App>
    </ConfigProvider>
  );
};

export default MainLayout;
