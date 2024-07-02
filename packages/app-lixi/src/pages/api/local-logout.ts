import { IronSession, IronSessionData, getIronSession } from 'iron-session';
import { NextApiRequest, NextApiResponse } from 'next';
import { sessionOptions } from 'src/shared/models/session';

async function localLogoutRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Process a POST request

    const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);
    session.localUser = null;
    await session.save();

    res.send({ ok: true });
  }
}

export default localLogoutRoute;
