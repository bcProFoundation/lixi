import { getSelectedAccount } from '@store/account/selectors';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { Layout, Spin } from 'antd';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { DefaultTheme, ThemeProvider } from 'styled-components';

import { LoadingOutlined } from '@ant-design/icons';

import { navBarHeaderList } from '@components/Common/navBarHeaderList';
import Footer from '@containers/Footer';
import Sidebar from '@containers/Sidebar';
import SidebarContent from '@containers/Sidebar/SidebarContent';
import Topbar from '@containers/Topbar';
import useDidMountEffectNotification from '@local-hooks/useDidMountEffectNotification';
import { setTransactionReady } from '@store/account/actions';
import { getIsGlobalLoading } from '@store/loading/selectors';
import { fetchNotifications } from '@store/notification/actions';
import { getAllNotifications } from '@store/notification/selectors';
import { getCurrentLocale, getIntlInitStatus } from '@store/settings/selectors';
import { getSlpBalancesAndUtxos } from '@store/wallet';
import { Header } from 'antd/lib/layout/layout';
import { injectStore } from 'src/utils/axiosClient';
import ModalManager from '../../Common/ModalManager';
import { GlobalStyle } from './GlobalStyle';
import { theme } from './theme';

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
  cursor: pointer;
  background: transparent !important;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 1rem 0;
  background: transparent;
  border-bottom: 0.5px solid gray;
  margin-bottom: 10px;
  .anticon {
    font-size: 18px;
    color: rgba(30, 26, 29, 0.6);
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
  @media (max-width: 960px) {
    width: 100%;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
    padding: 0 4px;
  }
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
    gap: 15px;
    justify-content: flex-start;
    @media (max-width: 960px) {
      margin-left: 0 !important;
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
      width: 100vw;
      margin: 0 auto;
      max-width: 640px;
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

const MainLayout: React.FC = (props: MainLayoutProps) => {
  const { children } = props;
  const selectedAccount = useSliceSelector(getSelectedAccount);
  const currentLocale = useSliceSelector(getCurrentLocale);
  const dispatch = useSliceDispatch();
  const [height, setHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [navBarTitle, setNavBarTitle] = useState('');
  const router = useRouter();
  const selectedKey = router.pathname ?? '';
  const disableSideBarRanking = ['lixi', 'profile'];
  const ref = useRef(null);
  const notifications = useSliceSelector(getAllNotifications);
  const slpBalancesAndUtxos = useSliceSelector(getSlpBalancesAndUtxos);
  const slpBalancesAndUtxosRef = useRef(slpBalancesAndUtxos);

  useEffect(() => {
    if (slpBalancesAndUtxos === slpBalancesAndUtxosRef.current) return;
    dispatch(setTransactionReady());
  }, [slpBalancesAndUtxos.nonSlpUtxos]);

  useDidMountEffectNotification();

  const setRef = useCallback(node => {
    if (node && node.clientHeight) {
      // Check if a node is actually passed. Otherwise node would be null.
      const height = node.clientHeight;
      setHeight(height);
    }
    // Save a reference to the node
    ref.current = node;
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      dispatch(
        fetchNotifications({
          accountId: selectedAccount.id,
          mnemonichHash: selectedAccount.mnemonicHash
        })
      );
    }
  }, []);

  injectStore(currentLocale);
  const isLoading = useSliceSelector(getIsGlobalLoading);

  const getNamePathDirection = () => {
    const itemSelect = navBarHeaderList.find(item => item.path === selectedKey) || null;
    setNavBarTitle(itemSelect?.name || '');
  };

  useEffect(() => {
    getNamePathDirection();
  }, [selectedKey]);

  useEffect(() => {
    setLoading(false);
  }, [selectedAccount]);

  return (
    <ThemeProvider theme={theme as DefaultTheme}>
      <GlobalStyle />
      <Spin spinning={loading} indicator={LoadingIcon}>
        <LixiApp>
          <Layout>
            <AppBody>
              <ModalManager />
              <AppContainer>
                <Sidebar />
                <Topbar ref={setRef} />
                <div className="container-content" id="scrollableDiv">
                  <SidebarContent />
                  <div className="content-child">{children}</div>
                  <Footer notifications={notifications} />
                </div>
              </AppContainer>
            </AppBody>
          </Layout>
        </LixiApp>
      </Spin>
    </ThemeProvider>
  );
};

export default MainLayout;
