import { makeExecutableSchema } from '@graphql-tools/schema'
// import { GraphQLServer as YogaServer } from 'graphql-yoga'
import { ApolloServer } from 'apollo-server'
import { buildSubgraphSchema } from '@apollo/subgraph'
import Axios from 'axios'
import { parse } from 'graphql'
// import { AddressInfo } from 'ws'
import { applyMiddleware } from '../src'

describe('integrations', () => {
  /* GraphQL Yoga */

  // https://github.com/prisma-labs/graphql-yoga/issues/449
  // We might bring back support for GraphQL Yoga if they start
  // supporting new GraphQL versions.
  //
  // test('GraphQL Yoga', async () => {
  //   const typeDefs = `
  //     type Query {
  //       test: String!
  //     }
  //   `

  //   const resolvers = {
  //     Query: {
  //       test: () => 'test',
  //     },
  //   }

  //   const schema = makeExecutableSchema({ typeDefs, resolvers })

  //   const schemaWithMiddleware = applyMiddleware(schema, async (resolve) => {
  //     const res = await resolve()
  //     return `pass-${res}`
  //   })

  //   const server = new YogaServer({
  //     schema: schemaWithMiddleware,
  //   })
  //   const http = await server.start({ port: 0 })
  //   try {
  //     const { port } = http.address() as AddressInfo
  //     const uri = `http://localhost:${port}/`

  //     /* Tests */

  //     const query = `
  //       query {
  //         test
  //       }
  //     `

  //     const body = await Axios.post(uri, {
  //       query,
  //     })

  //     /* Tests. */

  //     expect(body.data).toEqual({
  //       data: {
  //         test: 'pass-test',
  //       },
  //     })
  //   } finally {
  //     http.close()
  //   }
  // })

  /* Apollo Server */

  test('ApolloServer', async () => {
    /* Schema. */
    const typeDefs = `
      type Query {
        test: String!
      }
    `

    const resolvers = {
      Query: {
        test: () => 'test',
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    const schemaWithMiddleware = applyMiddleware(schema, async (resolve) => {
      const res = await resolve()
      return `pass-${res}`
    })

    const server = new ApolloServer({
      schema: schemaWithMiddleware,
    })

    await server.listen({ port: 8008 })

    const uri = `http://localhost:8008/`

    /* Tests */

    const query = `
      query {
        test
      }
    `
    try {
      const body = await Axios.post(uri, { query })
      /* Tests. */

      expect(body.data).toEqual({
        data: {
          test: 'pass-test',
        },
      })
    } finally {
      await server.stop()
    }
  })

  test('ApolloFederation', async () => {
    /* Schema. */
    const typeDefs = parse(`
      type User @key(fields: "id") {
        id: ID!
        name: String!
      }
    `)

    const resolvers = {
      User: {
        __resolveReference: ({ id }) => ({ id, name: 'test' }),
      },
    }

    const schema = buildSubgraphSchema({ typeDefs, resolvers })

    const schemaWithMiddleware = applyMiddleware(schema, async (resolve) => {
      const res = await resolve()
      return `pass-${res}`
    })

    const server = new ApolloServer({
      schema: schemaWithMiddleware,
    })

    await server.listen({ port: 8008 })

    const uri = `http://localhost:8008/`

    /* Tests */

    const query = `
      query {
        _entities (representations: [{ __typename: "User", id: "1" }]) {
          ... on User {
            name
          }
        }
      }
    `

    try {
      const body = await Axios.post(uri, { query })
      /* Tests. */

      expect(body.data).toEqual({
        data: {
          _entities: [{ name: 'pass-test' }],
        },
      })
    } finally {
      await server.stop()
    }
  })
})
