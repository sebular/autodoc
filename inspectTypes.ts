import { Type, Project, SourceFile, SyntaxKind, ts, TypeReferenceNode, Node, KindToNodeMappings } from 'ts-morph'
import { TypeDefLiteral, ApiEntry } from './types'
import { generateDocumentation } from './openApi'


const getExpressVariableName = (sourceFile: SourceFile): string => {
  const importDeclarations = sourceFile.getImportDeclarations()
  const match = importDeclarations.find(id => id.getText().match('express'))
  if (!match) {
    throw new Error('could not find express import')
  }
  const defaultImport = match.getDefaultImportOrThrow()
  return defaultImport.getText()
}

const convertTypeToRecord = (type: Type<ts.Type>): TypeDefLiteral => {
  const result: Record<string, string> = {}
  const apparentProperties = type.getApparentProperties();

  apparentProperties.forEach(p => {
    const valueDeclaration = p.getValueDeclarationOrThrow()
    const name = p.getEscapedName()
    const type = valueDeclaration.getType().getText()
    Object.assign(result, { [name]: type })
  });

  return result;
}

const processHandlerTypeReference = (typeReference: TypeReferenceNode): { requestParams: TypeDefLiteral, requestBody: TypeDefLiteral, response: TypeDefLiteral } => {
  console.log('processing handler type reference...', typeReference.print())
  const [
    _expressRequestTypeRef,               // the RequestHandler type itself, probably always useless
    requestParamsTypeRefNode,             // route params, i.e. /wat/:id -> { id: string }
    responseTypeRefNode,                  // type of the response body, i.e. res.json({ count: 9 }) -> { count: number }
    requestBodyTypeRefNode,               // type of the request body, i.e. const { name } = req.body -> { name: string }
  ] = typeReference.forEachChildAsArray()

  const requestParamsTypeRef = requestParamsTypeRefNode.asKindOrThrow(SyntaxKind.TypeReference)
  const responseTypeRef = responseTypeRefNode.asKindOrThrow(SyntaxKind.TypeReference)
  const requestBodyTypeRef = requestBodyTypeRefNode.asKindOrThrow(SyntaxKind.TypeReference)

  console.log('request type', requestBodyTypeRef.print())

  const requestParams = convertTypeToRecord(requestParamsTypeRef.getType())
  const response = convertTypeToRecord(responseTypeRef.getType())
  const requestBody = convertTypeToRecord(requestBodyTypeRef.getType())

  return { requestParams, response, requestBody }
}

const getMethod = (route: string): string => {
  const methodMatch = route.match(/(get|post|patch|put|delete)/)
  if (methodMatch === null) {
    throw new Error('could not get method from route: ' + route)
  }
  const [method] = methodMatch
  return method
}

    // asKindOrThrow<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind];
export const findChildByKindOrThrow = <TKind extends SyntaxKind>(node: Node, kind: TKind): KindToNodeMappings[TKind] => {
  const childNode = node.forEachChildAsArray().find(c => c.getKind() === kind)
  if (!childNode) {
    throw new Error(`could not find child of node [${node.print()}] with kind ${kind}`)
  }
  return childNode.asKindOrThrow(kind)
}

export const filterChildrenByKind = <TKind extends SyntaxKind>(node: Node, kind: TKind): KindToNodeMappings[TKind][] => {
  return node.forEachChildAsArray().filter(c => c.getKind() === kind).map(c => c.asKindOrThrow(kind))
}

export const run = (fileNames: string[], compilerOptions: ts.CompilerOptions): any => {
  const project = new Project({ compilerOptions })
  project.addSourceFilesAtPaths(fileNames)

  // somehow we will have to walk the project until we find the express import call
  const sourceFile = project.getSourceFileOrThrow('index.ts')

  // now we know what the express default import is
  const expressVariableName = getExpressVariableName(sourceFile)
  console.log('express was imported as:', expressVariableName)

  const api: ApiEntry[] = []

  sourceFile.getVariableDeclarations().forEach(vd => {
    const node = vd.forEachChildAsArray().find(n => n.getText().match(expressVariableName))
    if (!node) {
      return
    }

    const variableStatement = vd.getVariableStatementOrThrow()
    console.log('app', variableStatement.print())

    const declarationList = findChildByKindOrThrow(variableStatement, SyntaxKind.VariableDeclarationList)
    const declaration = findChildByKindOrThrow(declarationList, SyntaxKind.VariableDeclaration)
    const appIdentifier = findChildByKindOrThrow(declaration, SyntaxKind.Identifier)
    const appVariableName = appIdentifier.print()

    console.log('references')

    vd.findReferences().forEach(referencedSymbols => {
      const nodes = referencedSymbols.getReferences().map(ref => ref.getNode())
      const parents = nodes.flatMap(node => {
        const parent = node.getParent()
        return parent ? [parent] : []
      })
      const routeRegistrations = parents.filter(p => {
        return [
          `${appVariableName}.get`,
          `${appVariableName}.post`,
          `${appVariableName}.patch`,
          `${appVariableName}.put`,
          `${appVariableName}.delete`,
        ].includes(p.getText())
      })
      const fullRouteRegistrations = routeRegistrations.flatMap(node => {
        const parent = node.getParent()
        return parent ? [parent] : []
      })

      fullRouteRegistrations.forEach(rr => {
        console.log(rr.print())

        // rr.forEachChild(c => console.log(c.print(), c.getKind()))
        /*
          This is bad, it's just getting the last child node of the line.
            ex: app.get('/some/route', handleRoute)
                                       ^
                                   last child
        */
        const children = rr.forEachChildAsArray()
        const routeHandler = children[children.length - 1]

        const routeNode = children.find(c => c.getKind() === SyntaxKind.StringLiteral)
        if (!routeNode) {
          throw new Error('could not get route string from route registration call')
        }
        const route = routeNode.print()

        children.forEach(c => console.log(c.print(), c.getKindName()))


        console.log('route Handler', routeHandler.print(), routeHandler.getKindName())
        const routeHandlerAsIdentifier = routeHandler.asKindOrThrow(SyntaxKind.Identifier)
        const definitionNodes = routeHandlerAsIdentifier.getDefinitionNodes()
        if (definitionNodes.length !== 1) {
          throw new Error('multiple definitions found for route handler???')
        }
        const [definitionNode] = definitionNodes

        console.log('definition node', definitionNode.print())

        const typeReference = findChildByKindOrThrow(definitionNode, SyntaxKind.TypeReference)

        const types = processHandlerTypeReference(typeReference)

        const method = getMethod(rr.print())
        const result = { method, route, ...types }
        api.push(result)
      })
    })
  })

  // console.log('api', JSON.stringify(api, null, 2))
  const openApi = generateDocumentation(api)
  const json = JSON.stringify(openApi, null, 2)
  console.log(json)
  return openApi
}
