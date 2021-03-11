import { FastifyInstance } from 'fastify'
import { getPostgrestClient, getOwner } from '../../utils'
import { AuthenticatedRequest, Bucket } from '../../types/types'
import { FromSchema } from 'json-schema-to-ts'

const createBucketBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
  },
  required: ['name'],
} as const
// @todo change later
const successResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    owner: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'name'],
}
interface createBucketRequestInterface extends AuthenticatedRequest {
  Body: FromSchema<typeof createBucketBodySchema>
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async function routes(fastify: FastifyInstance) {
  const summary = 'Create a bucket'
  fastify.post<createBucketRequestInterface>(
    '/',
    {
      schema: {
        body: createBucketBodySchema,
        headers: { $ref: 'authSchema#' },
        summary,
        response: { 200: successResponseSchema, '4xx': { $ref: 'errorSchema#' } },
      },
    },
    async (request, response) => {
      const authHeader = request.headers.authorization
      const jwt = authHeader.substring('Bearer '.length)
      const postgrest = getPostgrestClient(jwt)
      const owner = await getOwner(jwt)

      const { name: bucketName } = request.body

      const { data: results, error, status } = await postgrest
        .from<Bucket>('buckets')
        .insert([
          {
            name: bucketName,
            owner,
          },
        ])
        .single()
      console.log(results, error)

      if (error) {
        return response.status(400).send({
          statusCode: error.code,
          error: error.details,
          message: error.message,
        })
      }
      return response.status(200).send(results)
    }
  )
}