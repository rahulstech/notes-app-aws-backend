import { NoteDynamoDbDataService } from "@notes-app/database-service"

export function mockCreateNoteId(service: NoteDynamoDbDataService, nids: string[]) {
  const mock = jest.spyOn(service as any, "createNoteId")
  nids.forEach(nid => mock.mockReturnValueOnce(nid))
}