import { PrismaClient, BurnType as BurnTypePrisma, ImageUploadableType } from '@prisma/client';
import BCHJS from '@bcpros/xpi-js';

require('dotenv').config();

const prismaClient = new PrismaClient();

async function main() {
  const uploadDetail = await prismaClient.uploadDetail.findMany({
    include: {
      upload: true
    }
  });

  for (let i = 0; i < uploadDetail.length; i++) {
    //Check the uploadDetail connection
    console.log('Updating uploadDetail connection', uploadDetail[i].id);

    if (uploadDetail[i].lixiId !== null) {
      await prismaClient.$transaction(async prisma => {
        //Check if the imageUploadable exist
        const result = await prisma.imageUploadable.findFirst({
          where: {
            lixi: {
              id: uploadDetail[i].lixiId!
            }
          }
        });

        if (result) {
          //if exist, update the uploads
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              }
            }
          });
        } else {
          //if not exist, create new imageUploadable
          await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: uploadDetail[i].accountId!
                }
              },
              lixi: {
                connect: { id: uploadDetail[i].lixiId! }
              },
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              },
              type: ImageUploadableType.LIXI
            }
          });
        }
      });
    }

    if (uploadDetail[i].pageCoverId !== null) {
      await prismaClient.$transaction(async prisma => {
        //Check if the imageUploadable exist
        const result = await prisma.imageUploadable.findFirst({
          where: {
            pageCover: {
              id: uploadDetail[i].pageCoverId!
            }
          }
        });

        if (result) {
          //if exist, update the uploads
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              }
            }
          });
        } else {
          //if not exist, create new imageUploadable
          await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: uploadDetail[i].accountId!
                }
              },
              pageCover: {
                connect: { id: uploadDetail[i].pageCoverId! }
              },
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              },
              type: ImageUploadableType.PAGE_COVER
            }
          });
        }
      });
    }

    if (uploadDetail[i].pageAvatarId !== null) {
      await prismaClient.$transaction(async prisma => {
        //Check if the imageUploadable exist
        const result = await prisma.imageUploadable.findFirst({
          where: {
            pageAvatar: {
              id: uploadDetail[i].pageAvatarId!
            }
          }
        });

        if (result) {
          //if exist, update the uploads
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              }
            }
          });
        } else {
          //if not exist, create new imageUploadable
          await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: uploadDetail[i].accountId!
                }
              },
              pageAvatar: {
                connect: { id: uploadDetail[i].pageAvatarId! }
              },
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              },
              type: ImageUploadableType.PAGE_AVATAR
            }
          });
        }
      });
    }

    if (uploadDetail[i].postId !== null) {
      await prismaClient.$transaction(async prisma => {
        //Check if the imageUploadable exist
        const result = await prisma.imageUploadable.findFirst({
          where: {
            post: {
              id: uploadDetail[i].postId!
            }
          }
        });

        if (result) {
          //if exist, update the uploads
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              }
            }
          });
        } else {
          //if not exist, create new imageUploadable
          await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: uploadDetail[i].accountId!
                }
              },
              post: {
                connect: { id: uploadDetail[i].postId! }
              },
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              },
              type: ImageUploadableType.POST
            }
          });
        }
      });
    }

    if (uploadDetail[i].avatarAccountId !== null) {
      await prismaClient.$transaction(async prisma => {
        //Check if the imageUploadable exist
        const result = await prisma.imageUploadable.findFirst({
          where: {
            accountAvatar: {
              id: uploadDetail[i].avatarAccountId!
            }
          }
        });

        if (result) {
          //if exist, update the uploads
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              }
            }
          });
        } else {
          //if not exist, create new imageUploadable
          await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: uploadDetail[i].accountId!
                }
              },
              accountAvatar: {
                connect: { id: uploadDetail[i].avatarAccountId! }
              },
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              },
              type: ImageUploadableType.ACCOUNT_AVATAR
            }
          });
        }
      });
    }

    if (uploadDetail[i].coverAccountId !== null) {
      await prismaClient.$transaction(async prisma => {
        //Check if the imageUploadable exist
        const result = await prisma.imageUploadable.findFirst({
          where: {
            accountCover: {
              id: uploadDetail[i].coverAccountId!
            }
          }
        });

        if (result) {
          //if exist, update the uploads
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              }
            }
          });
        } else {
          //if not exist, create new imageUploadable
          await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: uploadDetail[i].accountId!
                }
              },
              accountCover: {
                connect: { id: uploadDetail[i].coverAccountId! }
              },
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              },
              type: ImageUploadableType.ACCOUNT_COVER
            }
          });
        }
      });
    }

    if (uploadDetail[i].messageId !== null) {
      await prismaClient.$transaction(async prisma => {
        //Check if the imageUploadable exist
        const result = await prisma.imageUploadable.findFirst({
          where: {
            message: {
              id: uploadDetail[i].messageId!
            }
          }
        });

        if (result) {
          //if exist, update the uploads
          await prisma.imageUploadable.update({
            where: {
              id: result.id
            },
            data: {
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              }
            }
          });
        } else {
          //if not exist, create new imageUploadable
          await prisma.imageUploadable.create({
            data: {
              account: {
                connect: {
                  id: uploadDetail[i].accountId!
                }
              },
              message: {
                connect: { id: uploadDetail[i].messageId! }
              },
              uploads: {
                connect: { id: uploadDetail[i].upload.id }
              },
              type: ImageUploadableType.MESSAGE
            }
          });
        }
      });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
