// Get User
export interface GetUserParams extends Record<string, any> {
  userId: number
}

export interface GetUserResponseBody {
  id: number
  name: string
  age: number
}

export interface GetUserRequestBody {}


// Make Sandwich
export interface MakeSandwichParams {}

export interface MakeSandwichResponseBody {
  price: number
}

export interface MakeSandwichRequestBody extends Record<string, any> {
  sandwichType: string
  size: number
  additionalToppings: string[]
  count: number
}
