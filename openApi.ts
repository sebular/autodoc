import { arrayBuffer } from 'stream/consumers'
import { ApiEntry } from './types'

const convertRoute = (route: string): string => {
  const noQuotes = route.replace(/'/gm, '')
  const components = noQuotes.split('/')
  const converted = components.map(c => {
    if (!c.match(':')) {
      return c
    }
    return `{${c.replace(':', '')}}`
  })
  return converted.join('/')
}

const generateTypeObject = (type: string): any => {
  if (!type.match(/\[\]/)) {
    return { type }
  }
  const nonArray = type.replace(/\[\]/, '')
  return {
    type: 'array',
    items: { type: nonArray }
  }
}

export const generateDocumentation = (routes: ApiEntry[]) => {

  const paths = routes.reduce((pathsObject, { method, route, requestBody, requestParams, response }) => {
    const openApiRoute = convertRoute(route)
    const newEntry = {
      [openApiRoute]: {
        ...(pathsObject[openApiRoute] || {}),
        [method]: {
          parameters: Object.entries(requestParams).map(([name, type]) => ({
            name,
            in: 'path',
            required: true,
            schema: { type }
          })),
          requestBody: method !== 'get' && method !== 'delete' ? {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: Object.entries(requestBody).reduce((propertiesObject, [name, type]) => {
                    return {
                      ...propertiesObject,
                      [name]: generateTypeObject(type)
                    }
                  }, {} as any)
                }
              }
            }
          } : undefined,
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: Object.entries(response).reduce((propertiesObject, [name, type]) => {
                      return {
                        ...propertiesObject,
                        [name]: generateTypeObject(type) 
                      }
                    }, {} as any)
                  }
                }
              }
            }
          }



        }

      }
    }
    return {
      ...pathsObject,
      ...newEntry,
    }
  }, {} as any)

  // console.log(JSON.stringify({ paths }, null, 2))
  return {
    openapi: '3.0.0',
    info: {
      title: 'Autodoc Demo',
      version: '0.0.1'
    },
    paths
  }
}
