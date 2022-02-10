// this is a toy type, the real one would support infinite depth
export type TypeDefLiteral = Record<string, string>

export type ApiEntry = {
  method: string
  route: string
  requestParams: TypeDefLiteral
  response: TypeDefLiteral
  requestBody: TypeDefLiteral
}