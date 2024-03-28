import 'antd/dist/reset.css';
import '../styles/style.less';
// import '../styles/globals.css';
import Head from 'next/head';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';


import SplashScreen from '@components/Common/SplashScreen';
import {
  AuthenticationProvider,
  AuthorizationProvider,
  FeatureToggleProvider,
  ServiceWorkerProvider,
  SocketProvider,
  WalletProvider,
  callConfig
} from '@context/index';
import { wrapper } from '@store/store';
import { ConnectedRouter } from 'connected-next-router';
import { NextComponentType } from 'next';
import { NextSeo } from 'next-seo';
import { AppContext, AppInitialProps, AppLayoutProps } from 'next/app';
import NextNProgress from 'nextjs-progressbar';
import { ReactNode, useEffect, useState } from 'react';
import OutsideCallConsumer from 'react-outside-call';
import axiosClient from 'src/utils/axiosClient';
import { stripHtml } from 'string-strip-html';

const PersistGateServer = (props: any) => {
  return props.children;
};

const getDescription = (postAsString): string => {
  const post = JSON.parse(postAsString);

  return `${post.account.name} at Lixi: "${stripHtml(post.content).result}"`;
};

const getSitename = (postAsString): string => {
  const post = JSON.parse(postAsString);

  return `Posted by ${post.account.name}`;
};

const LixiApp: NextComponentType<AppContext, AppInitialProps, AppLayoutProps> = ({ Component, ...rest }: AppLayoutProps) => {
  const { store, props } = wrapper.useWrappedStore(rest);
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);

  // const Layout = Component.Layout || MainLayout;
  const getLayout = Component.getLayout || ((page: ReactNode) => page);
  const defaultImage = `${process.env.NEXT_PUBLIC_LIXI_URL}images/lixilotus-logo.svg`;
  const { pageProps } = props;
  const { postId, isMobile, postAsString } = pageProps;

  const canonicalUrl = postId ? process.env.NEXT_PUBLIC_LIXI_URL + `post/${postId}` : process.env.NEXT_PUBLIC_LIXI_URL;
  const description = postId ? getDescription(postAsString) : 'Your Attention Your Money!';
  const sitename = postId ? getSitename(postAsString) : 'lixi.social';

  //We need to fetch feature here because we need to get feature before rendering the page
  const getFeatures = async () => {
    const { data } = await axiosClient.get<string[]>('/api/features').catch(e => {
      console.error(e);
      return { data: [] };
    });

    setEnabledFeatures(data);
  };

  useEffect(() => {
    getFeatures();
  }, []);

  return (
    <Provider store={store}>
      <Head>
        <title>Lixi</title>
        {/*This is for sharing on telegram. If didnt work remove next commit*/}
        <meta name="twitter:image:src" content={defaultImage} />
      </Head>
      <NextSeo
        title="Lixi"
        description="A place where you have complete control on what you want to see and what you want others to see collectively. No platform influence. No platform ads."
        canonical={canonicalUrl}
        openGraph={{
          type: 'website',
          url: canonicalUrl,
          title: 'Lixi',
          description: description,
          images: [
            {
              url: defaultImage,
              width: 1200,
              height: 630,
              alt: 'Lotus Logo',
              type: 'image/jpeg'
            }
          ],
          site_name: sitename
        }}
        twitter={{
          handle: '@lixilotus',
          site: '@lixilotus',
          cardType: 'summary_large_image'
        }}
        facebook={{
          appId: '264679442628200'
        }}
      />
      <PersistGate persistor={store.__persistor} loading={<SplashScreen />}>
        <FeatureToggleProvider enabledFeatures={enabledFeatures}>
          <SocketProvider>
            <ServiceWorkerProvider>
              <WalletProvider>
                <AuthenticationProvider>
                  <AuthorizationProvider>
                    <OutsideCallConsumer config={callConfig}>
                      {/* <Layout className="lixi-app-layout"> */}
                      <ConnectedRouter>
                        <NextNProgress options={{ showSpinner: false }} height={5} />
                        {getLayout(<Component {...props.pageProps} />)}
                      </ConnectedRouter>
                      {/* </Layout> */}
                    </OutsideCallConsumer>
                  </AuthorizationProvider>
                </AuthenticationProvider>
              </WalletProvider>
            </ServiceWorkerProvider>
          </SocketProvider>
        </FeatureToggleProvider>
      </PersistGate>
    </Provider>
  );
};

export default LixiApp;
