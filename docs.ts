import express from 'express'
import { run } from './inspectTypes'
import { ts } from 'ts-morph'
import swaggerUi from 'swagger-ui-express'


const app = express()
const port = 9876

app.use('/api-docs', swaggerUi.serve, (req: any, res: any, next: any) => {
  const entryPoint = `${process.cwd()}/index.ts`
  const result = run([entryPoint], {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
  })
  swaggerUi.setup(result)(req, res, next)
})

app.listen(port, () => console.log('listening on port', port))
