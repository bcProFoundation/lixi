import OnboardingComponent from '@components/Onboarding/Onboarding';
import { SagaStore, wrapper } from 'src/store/store';
import { IronSessionData, getIronSession } from 'iron-session';
import { getSelectorsByUserAgent } from 'react-device-detect';
import { END } from 'redux-saga';
import { LocalUser } from 'src/shared/models/localUser';
import { sessionOptions } from 'src/shared/models/session';

type OnboardingProps = {
  isMobile: boolean;
  localUser: LocalUser;
};

const OnboardingPage = ({ isMobile, localUser }: OnboardingProps) => {
  return <OnboardingComponent />;
};

export const getServerSideProps = wrapper.getServerSideProps(
  (store: SagaStore) =>
    async function getServerSideProps(context) {
      const { req } = context;
      const { headers } = req;

      const session = await getIronSession<IronSessionData>(context.req, context.res, sessionOptions);

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

export default OnboardingPage;
