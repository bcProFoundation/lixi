import { websocketSaga } from '@store/websocket';
import { accountSaga } from '@store/account/saga';
import { envelopeSaga } from '@store/envelope/saga';
import { settingsSaga } from '@store/settings/saga';
import { localAccountSaga } from '@store/localAccount/saga';
import { analyticEventSaga } from '@store/analytic-event/saga';
import { burnSaga } from '@store/burn/saga';
import { categorySaga } from '@store/category/saga';
import { claimSaga } from '@store/claim/saga';
import { commentSaga } from '@store/comment/saga';
import { countrySaga } from '@store/country/saga';
import { lixiSaga } from '@store/lixi/saga';
import { messageSaga } from '@store/message/saga';
import { notificationSaga } from '@store/notification/saga';
import { pageSaga } from '@store/page/saga';
import { postSaga } from '@store/post/saga';
import { worshipSaga } from '@store/worship/saga';
import { sendSaga } from '@store/send/saga';
import { tokenSaga } from '@store/token/saga';
import { walletSaga } from '@store/wallet/saga';
import { webpushSaga } from '@store/webpush/saga';
import { all } from 'redux-saga/effects';

export default function* rootSaga() {
  yield all([
    walletSaga(),
    accountSaga(),
    localAccountSaga(),
    lixiSaga(),
    sendSaga(),
    claimSaga(),
    envelopeSaga(),
    settingsSaga(),
    notificationSaga(),
    webpushSaga(),
    worshipSaga(),
    pageSaga(),
    postSaga(),
    commentSaga(),
    countrySaga(),
    tokenSaga(),
    burnSaga(),
    categorySaga(),
    messageSaga(),
    websocketSaga(),
    analyticEventSaga()
  ]);
}
