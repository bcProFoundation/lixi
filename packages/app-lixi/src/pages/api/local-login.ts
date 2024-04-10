import { IronSession, IronSessionData, getIronSession } from 'iron-session';
import { NextApiRequest, NextApiResponse } from 'next';
import { LocalUser } from 'src/shared/models/localUser';
import { sessionOptions } from 'src/shared/models/session';

async function localLoginRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Process a POST request

    const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);
    const { id, address, name } = await req.body;

    const localUser: LocalUser = {
      isLocalLoggedIn: true,
      id,
      address,
      name
    };

    session.localUser = localUser;
    await session.save();

    res.send({ ok: true });
  }
}

export default localLoginRoute;
