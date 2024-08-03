import { PrismaClient } from '@bcpros/lixi-prisma';
import { Redis } from 'ioredis';
import * as _ from 'lodash';
require('dotenv').config();

const prismaClient = new PrismaClient();
const redis = new Redis({
  port: Number(process.env.REDIS_PORT) ?? 6379,
  host: process.env.REDIS_HOST
});

async function main() {
  const resetDanaBurn = {
    danaBurnUp: 0,
    danaBurnDown: 0,
    danaBurnScore: 0,
  }
  const resetDanaReceive = {
    danaReceivedUp: 0,
    danaReceivedDown: 0,
    danaReceivedScore: 0
  }

  //reset account
  const resetAccoutDana = prismaClient.accountDana.updateMany({
    data: {
      ...resetDanaBurn,
      ...resetDanaReceive,
      danaGiven: 0,
      danaReceived: 0
    }
  })
  const resetHistoryAccountDana = prismaClient.accountDanaHistory.updateMany({
    data: {
      givenDownValue: 0,
      givenUpValue: 0,
      receivedDownValue: 0,
      receivedUpValue: 0
    }
  })

  //reset comment
  const resetCommentDana = prismaClient.commentDana.updateMany({
    data: {
      ...resetDanaBurn
    }
  })
  const resetComment = prismaClient.comment.updateMany({
    data: {
      ...resetDanaBurn
    }
  })

  //reset hashtag
  const resetHashtagDana = prismaClient.hashtagDana.updateMany({
    data: {
      ...resetDanaBurn,
      ...resetDanaReceive,
    }
  })
  const resetHashtag = prismaClient.hashtag.updateMany({
    data: {
      ...resetDanaBurn
    }
  })

  //reset page
  const resetPageDana = prismaClient.pageDana.updateMany({
    data: {
      ...resetDanaBurn,
      ...resetDanaReceive,
    }
  })
  const resetPage = prismaClient.page.updateMany({
    data: {
      ...resetDanaBurn
    }
  })

  //reset post
  const resetPostDana = prismaClient.postDana.updateMany({
    data: {
      ...resetDanaBurn,
      ...resetDanaReceive,
    }
  })
  const resetPost = prismaClient.post.updateMany({
    data: {
      ...resetDanaBurn
    }
  })
  const resetRepostDana = prismaClient.repostDana.updateMany({
    data: {
      ...resetDanaBurn
    }
  })

  //reset token
  const resetTokenDana = prismaClient.tokenDana.updateMany({
    data: {
      ...resetDanaBurn,
      ...resetDanaReceive,
    }
  })
  
  //delete keys timeline in redis
  let cursor = '0';
  const keysTimeline: string[] = [];
    do {
        // Use the SCAN command to find keys matching the pattern
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', "lixilotus:timeline:*", 'COUNT', '10000');

        // If there are keys, delete them
        if (keys.length > 0) {
          keysTimeline.push(...keys)
        }

        // Update the cursor
        cursor = newCursor;
      } while (cursor !== '0');
      
      //delete top account in redis

      let cursorTopAccount = '0';
      const keysTopAccount: string[] = [];
        do {
            // Use the SCAN command to find keys matching the pattern
            const [newCursor, keys] = await redis.scan(cursorTopAccount, 'MATCH', "lixilotus:topAccountDanaGiven:*", 'COUNT', '10000');
    
            // If there are keys, delete them
            if (keys.length > 0) {
              keysTopAccount.push(...keys)
            }
    
            // Update the cursor
            cursorTopAccount = newCursor;
        } while (cursorTopAccount !== '0');

    //delete keys dana in redis
    const keysDana = [
      "lixilotus:items:pages:dana",
      "lixilotus:items:tokens:dana",
      "lixilotus:items:accounts:dana",
      "lixilotus:items:posts:dana",
      "lixilotus:items:commentdana",
      "lixilotus:items:hashtagdana",
    ]

    //delete data of account and page
    const keysDataAccountPage = [
      'lixilotus:items:accounts:item-data',
      'lixilotus:items:pages:item-data'
    ]

    Promise.all([
      resetAccoutDana,
      resetHistoryAccountDana,
      resetCommentDana,
      resetComment,
      resetHashtagDana,
      resetHashtag,
      resetPageDana,
      resetPage,
      resetPostDana,
      resetPost,
      resetRepostDana,
      resetTokenDana,
      redis.del(...keysDana, ...keysTimeline, ...keysTopAccount, ...keysDataAccountPage)
    ]).then(result => {
      console.log("Finish!!")
    })
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
