import { getSelectedAccount } from '@store/account/selectors';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { getIsBootstrapped } from '@store/persistor/selectors';
import { SagaStore, wrapper } from '@store/store';
import axios from 'axios';
import { IronSessionData, getIronSession } from 'iron-session';
import { useRouter } from 'next/router';
import { getSelectorsByUserAgent } from 'react-device-detect';
import { END } from 'redux-saga';
import { LocalUser } from 'src/shared/models/localUser';
import { sessionOptions } from 'src/shared/models/session';
import TimelineListing from '../components/Timeline/TimelineListing';

type HomePageProps = {
  isMobile: boolean;
  localUser: LocalUser;
};

const HomePage = ({ isMobile, localUser }: HomePageProps) => {

  const localLogout = async () => {
    const url = '/_api/local-logout';
    await axios.post(url);
  };

  return <TimelineListing />;
};

export const getServerSideProps = wrapper.getServerSideProps((store: SagaStore) =>
  async function getServerSideProps(context) {
    const { req } = context;
    const { headers } = req;

    const session = await getIronSession<IronSessionData>(
      context.req,
      context.res,
      sessionOptions,
    );


    store.dispatch(END);
    await (store as SagaStore).__sagaTask.toPromise();

    let isMobile = false;
    if (typeof window === 'undefined' && headers['user-agent']) {
      const userAgent = req ? req.headers['user-agent'] : '';
      isMobile = getSelectorsByUserAgent(userAgent).isMobile;
    }


    const localUser = session.localUser;

    return {
      props: {
        isMobile,
        localUser: localUser ?? null
      }
    };
  }
);

export default HomePage;
