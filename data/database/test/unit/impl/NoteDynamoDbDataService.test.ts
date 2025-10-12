import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { APP_ERROR_CODE } from "@notes-app/common";
import { DYNAMODB_ERROR_CODES, NoteDynamoDbDataService, NoteItem, NoteMediaItem, NoteMediaStatus } from "@notes-app/database-service";
import { mockCreateNoteId } from "../../util/testhelpers";

jest.mock("@aws-sdk/client-dynamodb");

const TABLE_NAME = "user_notes";
const MAX_ALLOWED_MEDIAS_PER_NOTE = 5;

describe("NoteDynamodbDbDataService unit tests", () => {

  let mockSend: jest.SpyInstance;
  let service: NoteDynamoDbDataService;

  beforeEach(() => {
    
      const testClient = new DynamoDBClient({
        region: "test",
        credentials: {
          accessKeyId: "test",
          secretAccessKey: "test"
        }
      });

      mockSend = jest.spyOn(testClient,"send");

      service = new NoteDynamoDbDataService({
          client: testClient,
          maxMediasPerItem: MAX_ALLOWED_MEDIAS_PER_NOTE,
          notesTableName: TABLE_NAME,
      });
  })

  afterEach(() => {
      jest.clearAllMocks();
  })

  // createNoteMultipleNotes

  test("createMultipleNotes none exists; added successfully", async () => {

    mockCreateNoteId(service, ["NID-1","NID-2","NID-3"]);

    mockSend
    // getNoteIdsForNoteGlobalIds
    .mockResolvedValueOnce({ Item: marshall({ ngids: {} }) })
    // no call made to getNotesByNoteIds as ngids map is empty
    // createSingleNote
    .mockResolvedValue({})

    await expect(service.createMultipleNotes("USER#1",[
        {
          global_id: "note-1",
          title: "Project Alpha Kickoff",
          content: "Meeting notes from the project alpha kickoff session. Key stakeholders attended and agreed on the initial timeline and scope. Must follow up on budget approval by Friday.",
          short_content: "Meeting notes for Project Alpha kickoff. Follow up on budget.",
          timestamp_created: 1701187200,
          timestamp_modified: 1701187200
        },
        {
          global_id: "note-2",
          title: "Grocery List for Dinner",
          content: "Need to buy: chicken breast, rice, broccoli, soy sauce, and a lemon. Check for any deals on fresh herbs like cilantro or parsley.",
          short_content: "Chicken, rice, broccoli, soy sauce, lemon, and herbs.",
          timestamp_created: 1701273600,
          timestamp_modified: 1701273600
        },
        {
          global_id: "note-3",
          title: "Book Recommendation: The Martian",
          content: "Highly recommend 'The Martian' by Andy Weir. Excellent blend of science, humor, and survival story. Download the audiobook for the next long drive.",
          short_content: "Recommended book: 'The Martian' by Andy Weir.",
          timestamp_created: 1701360000,
          timestamp_modified: 1701360000
        }
      ]))
    .resolves.toStrictEqual([
          {
            global_id: "note-1",
            SK: "NID-1",
            title: "Project Alpha Kickoff",
            content: "Meeting notes from the project alpha kickoff session. Key stakeholders attended and agreed on the initial timeline and scope. Must follow up on budget approval by Friday.",
            short_content: "Meeting notes for Project Alpha kickoff. Follow up on budget.",
            timestamp_created: 1701187200,
            timestamp_modified: 1701187200
          },
          {
            global_id: "note-2",
            SK: "NID-2",
            title: "Grocery List for Dinner",
            content: "Need to buy: chicken breast, rice, broccoli, soy sauce, and a lemon. Check for any deals on fresh herbs like cilantro or parsley.",
            short_content: "Chicken, rice, broccoli, soy sauce, lemon, and herbs.",
            timestamp_created: 1701273600,
            timestamp_modified: 1701273600
          },
          {
            global_id: "note-3",
            SK: "NID-3",
            title: "Book Recommendation: The Martian",
            content: "Highly recommend 'The Martian' by Andy Weir. Excellent blend of science, humor, and survival story. Download the audiobook for the next long drive.",
            short_content: "Recommended book: 'The Martian' by Andy Weir.",
            timestamp_created: 1701360000,
            timestamp_modified: 1701360000
          }
      ])
  });

  test("createMultipleNotes some exists; rest added successfully", async () => {

    mockCreateNoteId(service, ["NID-5","NID-7"]);

    mockSend
    // getNoteIdsForNoteGlobalIds
    .mockResolvedValueOnce({ Item: marshall({ ngids: {"note-6":"NID-6"} }) })
    //getNotesByNoteIds
    .mockResolvedValueOnce({
      Responses: {
        [TABLE_NAME]: [
          marshall({
            PK: "USER#1",
            SK: "NID-6",
            global_id: "note-6",
            title: "Grocery List for Dinner",
            content: "Need to buy: chicken breast, rice, broccoli, soy sauce, and a lemon. Check for any deals on fresh herbs like cilantro or parsley.",
            short_content: "Chicken, rice, broccoli, soy sauce, lemon, and herbs.",
            timestamp_created: 1701273600,
            timestamp_modified: 1701273600
          })
        ]
      }
    })
    // createSingleNote
    .mockResolvedValue({})

    await expect(service.createMultipleNotes("USER#1",[
        {
          global_id: "note-5",
          title: "Project Alpha Kickoff",
          content: "Meeting notes from the project alpha kickoff session. Key stakeholders attended and agreed on the initial timeline and scope. Must follow up on budget approval by Friday.",
          short_content: "Meeting notes for Project Alpha kickoff. Follow up on budget.",
          timestamp_created: 1701187200,
          timestamp_modified: 1701187200
        },
        {
          global_id: "note-6",
          title: "Grocery List for Dinner",
          content: "Need to buy: chicken breast, rice, broccoli, soy sauce, and a lemon. Check for any deals on fresh herbs like cilantro or parsley.",
          short_content: "Chicken, rice, broccoli, soy sauce, lemon, and herbs.",
          timestamp_created: 1701273600,
          timestamp_modified: 1701273600
        },
        {
          global_id: "note-7",
          title: "Book Recommendation: The Martian",
          content: "Highly recommend 'The Martian' by Andy Weir. Excellent blend of science, humor, and survival story. Download the audiobook for the next long drive.",
          short_content: "Recommended book: 'The Martian' by Andy Weir.",
          timestamp_created: 1701360000,
          timestamp_modified: 1701360000
        }
      ]))
    .resolves.toStrictEqual([
          {
            global_id: "note-5",
            SK: "NID-5",
            title: "Project Alpha Kickoff",
            content: "Meeting notes from the project alpha kickoff session. Key stakeholders attended and agreed on the initial timeline and scope. Must follow up on budget approval by Friday.",
            short_content: "Meeting notes for Project Alpha kickoff. Follow up on budget.",
            timestamp_created: 1701187200,
            timestamp_modified: 1701187200
          },
          {
            global_id: "note-7",
            SK: "NID-7",
            title: "Book Recommendation: The Martian",
            content: "Highly recommend 'The Martian' by Andy Weir. Excellent blend of science, humor, and survival story. Download the audiobook for the next long drive.",
            short_content: "Recommended book: 'The Martian' by Andy Weir.",
            timestamp_created: 1701360000,
            timestamp_modified: 1701360000
          },
          {
            global_id: "note-6",
            SK: "NID-6",
            title: "Grocery List for Dinner",
            content: "Need to buy: chicken breast, rice, broccoli, soy sauce, and a lemon. Check for any deals on fresh herbs like cilantro or parsley.",
            short_content: "Chicken, rice, broccoli, soy sauce, lemon, and herbs.",
            timestamp_created: 1701273600,
            timestamp_modified: 1701273600
          },
      ])
  });

  // getNoteById

  test('getNoteById returns a note if found',async () => {
    const expected: NoteItem = {
        PK: 'USER#1',
        SK: 'NID-1',
        global_id: 'note-1',
        title: 'note title 1',
        content: 'Radium quenches vexing zithers. Bright yellow foxes jump over the lazy brown dog. Five wicked wizards quickly analyze every jump of the nimble acrobats on the big screen. The quick brown fox jumps over the lazy dogs.',
        short_content: 'Radium quenches vexing zithers. Bright yellow foxes jump ove',
        medias: {},
        timestamp_created: 15,
        timestamp_modified: 15
      };

    mockSend.mockResolvedValueOnce({ 
      Item: marshall(expected) 
    });
    
    await expect(service.getNoteById('USER#1', 'NID-1')).resolves.toStrictEqual(expected);
  });

  test('getNoteById throws AppError with code NOTE_NOT_FOND if missing', async () => {

    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(service.getNoteById("USER#1", "NID-X")).rejects
    .toThrow(expect.objectContaining({ 
      code: APP_ERROR_CODE.NOT_FOUND
    }));
  });

  // updateSingleNote

  // updateSingleNote
  test("updateSingleNote - updates note successfully and returns updated attributes", async () => {
    const SK = "NID-1";
    const updateOutput = {
      timestamp_modified: 15,
      title: "Updated Title",
      content: "This is a long updated content. The updated content contains character more than sixty. Update input does not contain any short_content. So, service itself will add a short_content",
      short_content: "This is a long updated content. The updated content contains"
    };

    mockSend.mockResolvedValueOnce({
      Attributes: marshall(updateOutput),
    });

    await expect(service.updateSingleNote("USER#1", {
      SK,
      timestamp_modified: 0,
      title: "Updated Title",
      content: "This is a long updated content. The updated content contains character more than sixty. Update input does not contain any short_content. So, service itself will add a short_content",
      short_content: "This is a long updated content. The updated content contains"
    })).resolves
    .toStrictEqual({
      SK,
      ...updateOutput
    });
  });

  test("updateSingleNote - throws error when note not found", async () => {
    mockSend.mockRejectedValueOnce({
      name: "ConditionalCheckFailedException",
    });

    await expect(service.updateSingleNote("USER#1", {
      SK: "NID-1",
      timestamp_modified: 15,
      title: "Updated",
    })).rejects
    .toThrow(expect.objectContaining({
      code: APP_ERROR_CODE.NOT_FOUND
    }));

    expect(mockSend).toHaveBeenCalledTimes(1); // to ensure error throws after send call
  });


  // deleteMultipleNotes

  test("deleteMultipleNotes: all delete successful", async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(service.deleteMultipleNotes("USER#1",["NOTE-1","NOTE-2","NOTE-3"]))
    .resolves.toStrictEqual({})
  });

  test("deleteMultipleNotes: some unsuccessful",async () => {
    // deleteMultiple retry with UnprocessedItems upto 3 times
    // therefore instead of mockResolvedValueOnce i need to use mockResolvedValue
    // to return the expected value till the last trial
    mockSend.mockResolvedValue({
      UnprocessedItems: {
        [TABLE_NAME]: [
        {
          DeleteRequest: {
            Key: marshall({ PK: "USER#1", SK: "NOTE-1" }),
          }
        },
        {
          DeleteRequest: {
            Key: marshall({ PK: "USER#1", SK: "NOTE-3" }),
          }
        },
      ]}
    });

    await expect(service.deleteMultipleNotes("USER#1",["NOTE-1","NOTE-2","NOTE-3"]))
    .resolves.toStrictEqual({
      unsuccessful: ["NOTE-1","NOTE-3"]
    });
  });

  /* Note Medias */

  // addNoteMedias

  test("addNoteMedias - adds new medias successfully when note has space", async () => {
    const PK = "USER#1";
    const SK = "NID-1";

    const existingMedias = {
      "m1": {
        key: "file1.jpg",
        type: "image/jpeg",
        size: 1200,
        status: NoteMediaStatus.AVAILABLE,
        global_id: "gid-1",
        media_id: "m1",
        url: "https://s3/file1.jpg"
      }
    };

    const newMedias: NoteMediaItem[] = [
      {
        key: "file2.jpg",
        type: "image/jpeg",
        size: 2200,
        status: NoteMediaStatus.AVAILABLE,
        global_id: "gid-2",
        media_id: "m2",
        url: "https://s3/file2.jpg"
      }
    ];

    
    mockSend
      // mock getNoteMedias
      .mockResolvedValueOnce({
        Items: [marshall({ medias: existingMedias })],
      })
      // mock updateNoteMedias returns Attributes with updated medias
      .mockResolvedValueOnce({
        Attributes: marshall({
          medias: {
            ...existingMedias,
            m2: newMedias[0],
          },
        }),
      });

    await expect(service.addNoteMedias(PK, SK, newMedias)).resolves.toStrictEqual([newMedias[0]]);
  });

  test("addNoteMedias - throws error when exceeding max media count", async () => {
    const PK = "USER#1";
    const SK = "NID-1";

    const existing = Array.from({ length: 5 }).reduce<Record<string, NoteMediaItem>>((acc, _, i) => {
      acc[`m${i + 1}`] = {
        key: `f${i + 1}.jpg`,
        type: "image/jpeg",
        size: 1000,
        status: NoteMediaStatus.AVAILABLE,
        global_id: `gid-${i + 1}`,
        media_id: `m${i + 1}`,
        url: `https://s3/${i + 1}`,
      };
      return acc;
    }, {});

    mockSend.mockResolvedValueOnce({
      Items: [marshall({ medias: existing })],
    });

    await expect(
      service.addNoteMedias(PK, SK, [
        {
          key: "fileX.jpg",
          type: "image/jpeg",
          size: 100,
          status: NoteMediaStatus.NOT_AVAILABLE,
          global_id: "gid-x",
          media_id: "mx",
          url: "https://s3/filex.jpg",
        },
      ])
    ).rejects.toThrow(expect.objectContaining({
      code: DYNAMODB_ERROR_CODES.TOO_MANY_MEDIA_ITEMS
    }));
  });

  // getNoteMedias

  test("getNoteMedias - returns medias successfully", async () => {
    const PK = "USER#1";
    const SK = "NID-1";

    const medias = {
      m1: {
        key: "photo.jpg",
        type: "image/jpeg",
        size: 1200,
        status: NoteMediaStatus.AVAILABLE,
        global_id: "gid-1",
        media_id: "m1",
        url: "https://s3/photo.jpg",
      },
    };

    mockSend.mockResolvedValueOnce({
      Items: [marshall({ medias })],
    });

    await expect(service.getNoteMedias(PK, SK)).resolves.toStrictEqual(medias);
  });

  test("getNoteMedias - throws error when note not found", async () => {
    mockSend.mockResolvedValueOnce({ Items: undefined });

    await expect(service.getNoteMedias("USER#X", "NID-X")).rejects
    .toThrow(expect.objectContaining({ code: APP_ERROR_CODE.NOT_FOUND }))
  });

  // updateMediaStatus

  test("updateMediaStatus - updates status of medias successfully", async () => {
    mockSend.mockResolvedValueOnce({});

    await expect(
      service.updateMediaStatus("USER#1", "NID-1", [
        { media_id: "m1", status: NoteMediaStatus.AVAILABLE },
        { media_id: "m2", status: NoteMediaStatus.AVAILABLE },
      ])
    ).resolves.not.toThrow();
  });

  test("updateMediaStatus - throws error when note not found", async () => {
    
    mockSend.mockRejectedValueOnce({
      name: "ConditionalCheckFailedException"
    });

    await expect(service.removeNoteMedias("USER#1", "NID-x", ["m1"])).rejects
          .toThrow(expect.objectContaining({
              code: APP_ERROR_CODE.NOT_FOUND
            }));
  });

  // removeNoteMedias

  test("removeNoteMedias - removes given medias and returns deleted keys", async () => {
    const mediasBeforeDelete = {
      m1: {
        key: "file1.jpg",
        type: "image/jpeg",
        size: 100,
        status: NoteMediaStatus.AVAILABLE,
        global_id: "gid1",
        media_id: "m1",
      },
      m2: {
        key: "file2.jpg",
        type: "image/jpeg",
        size: 200,
        status: NoteMediaStatus.AVAILABLE,
        global_id: "gid2",
        media_id: "m2",
      },
    };

    mockSend.mockResolvedValueOnce({
      Attributes: marshall({ medias: mediasBeforeDelete }),
    });

    await expect(service.removeNoteMedias("USER#1", "NID-1", ["m1"]))
    .resolves.toStrictEqual(["file1.jpg"]);
  });

  test("removeNoteMedias - returns empty array if nothing deleted", async () => {
    mockSend.mockResolvedValueOnce({ Attributes: undefined });
    const result = await service.removeNoteMedias("USER#1", "NID-1", ["m1"]);
    expect(result).toStrictEqual([]);
  });

  test("removeNoteMedias - throws error when note not found", async () => {
    
    mockSend.mockRejectedValueOnce({
      name: "ConditionalCheckFailedException"
    });

    await expect(service.removeNoteMedias("USER#1", "NID-x", ["m1"])).rejects
          .toThrow(expect.objectContaining({
                code: APP_ERROR_CODE.NOT_FOUND
              }));
  });

})