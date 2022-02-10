import express, { RequestHandler } from 'express'
import { inspectRoutes } from './inspectRoutes'
export { RequestHandler } from 'express'
import {
  GetUserParams,
  GetUserResponseBody,
  GetUserRequestBody,
  MakeSandwichParams,
  MakeSandwichResponseBody,
  MakeSandwichRequestBody,
} from './apiTypes'

// Gets a User by User ID
const getUser: RequestHandler<GetUserParams, GetUserResponseBody, GetUserRequestBody> = (req, res) => {
  const { userId } = req.params
  res.json({ id: userId, name: 'Jim Bob', age: 50 })
};

// Makes a sandwich
const makeSandwich: RequestHandler<MakeSandwichParams, MakeSandwichResponseBody, MakeSandwichRequestBody> = (req, res) => {
  res.json({ price: 1000 })
}

const app = express()
app.get('/users/:userId', getUser)
app.post('/sandwiches', makeSandwich)

app.listen(9999, () => {
  inspectRoutes(app)
  console.log('listening...')
})
