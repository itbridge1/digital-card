const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NFC Platform API',
      version: '2.0.0',
      description:
        'Multi-tenant NFC business card platform. Supports Admin, Manager, and card-holder roles. ' +
        'Authenticate via **POST /api/auth/login**, copy the returned `token`, then click **Authorize** above and enter `Bearer <token>`.',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from POST /api/auth/login',
        },
      },
      schemas: {
        // ── Auth ────────────────────────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@nfcplatform.com' },
            password: { type: 'string', format: 'password', example: 'password123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                name: { type: 'string', example: 'Platform Admin' },
                email: { type: 'string', example: 'admin@nfcplatform.com' },
                tenantId: { type: 'string', example: 'BUSINESS_01' },
                role: { type: 'string', enum: ['admin', 'manager', 'viewer'], example: 'admin' },
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              },
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password', 'tenantId'],
          properties: {
            name: { type: 'string', example: 'Jane Manager' },
            email: { type: 'string', format: 'email', example: 'jane@techcorp.com' },
            password: { type: 'string', minLength: 6, example: 'secret123' },
            tenantId: { type: 'string', example: 'BUSINESS_01' },
            role: { type: 'string', enum: ['admin', 'manager'], default: 'manager', example: 'manager' },
          },
        },

        // ── Tenant / Organization ────────────────────────────────
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            tenantId: { type: 'string', example: 'SCHOOL_01' },
            name: { type: 'string', example: 'Lincoln High School' },
            type: { type: 'string', enum: ['SCHOOL', 'HOSPITAL', 'BUSINESS'], example: 'SCHOOL' },
            contactEmail: { type: 'string', format: 'email', example: 'admin@lincoln.edu' },
            logoUrl: { type: 'string', nullable: true, example: '/uploads/logos/abc123.png' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TenantInput: {
          type: 'object',
          required: ['tenantId', 'name', 'type', 'contactEmail'],
          properties: {
            tenantId: { type: 'string', example: 'RETAIL_01' },
            name: { type: 'string', example: 'Retail Corp' },
            type: { type: 'string', enum: ['SCHOOL', 'HOSPITAL', 'BUSINESS'], example: 'BUSINESS' },
            contactEmail: { type: 'string', format: 'email', example: 'contact@retail.com' },
            logoUrl: { type: 'string', nullable: true, example: '/uploads/logos/abc123.png' },
          },
        },

        // ── Card ─────────────────────────────────────────────────
        Card: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            tenantId: { type: 'string', example: 'SCHOOL_01' },
            tagId: { type: 'string', example: 'STUDENT001' },
            businessUrl: { type: 'string', example: 'http://localhost:5000/t/STUDENT001' },
            profileImageUrl: { type: 'string', nullable: true, example: '/uploads/profiles/xyz.png' },
            tapCount: { type: 'integer', example: 5 },
            lastTapped: { type: 'string', format: 'date-time', nullable: true },
            metadata: {
              type: 'object',
              example: { name: 'John Doe', position: 'Student', department: 'Grade 12', email: 'john@lincoln.edu', phone: '+1234567890' },
            },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CardInput: {
          type: 'object',
          required: ['tagId'],
          properties: {
            tagId: { type: 'string', example: 'STUDENT010' },
            profileImageUrl: { type: 'string', nullable: true, example: '/uploads/profiles/xyz.png' },
            metadata: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Alice Smith' },
                position: { type: 'string', example: 'Student' },
                department: { type: 'string', example: 'Grade 11' },
                email: { type: 'string', example: 'alice@lincoln.edu' },
                phone: { type: 'string', example: '+1555000001' },
              },
            },
          },
        },

        // ── Upload ───────────────────────────────────────────────
        UploadResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            url: { type: 'string', example: '/uploads/profiles/abc123.png' },
          },
        },

        // ── Generic ──────────────────────────────────────────────
        SuccessMessage: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Descriptive error message' },
          },
        },
      },
    },
    // Apply BearerAuth globally — individual public endpoints override with security: []
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication — login and account management' },
      { name: 'Organizations (public)', description: 'Public organization listing' },
      { name: 'Manager — Organizations', description: 'Manage organizations (admin & manager)' },
      { name: 'Manager — Cards', description: 'Manage card holders within organizations (admin & manager)' },
      { name: 'Cards (legacy)', description: 'Direct card operations scoped to authenticated user\'s tenant' },
      { name: 'Upload', description: 'Image upload for profile photos and organization logos' },
      { name: 'NFC Redirect', description: 'Public NFC tap redirect endpoint' },
    ],
    paths: {
      // ── Auth ──────────────────────────────────────────────────────────────────
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          description: 'Returns a JWT token. Use the token as `Bearer <token>` in the Authorize dialog.',
          security: [],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Create admin / manager account',
          description: '**Admin only.** Creates a new `admin` or `manager` login account.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
          },
          responses: {
            201: { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden — admin only' },
            409: { description: 'Email already exists' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Current user data' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/auth/managers': {
        get: {
          tags: ['Auth'],
          summary: 'List all admin & manager accounts',
          description: '**Admin only.**',
          security: [{ BearerAuth: [] }],
          responses: {
            200: {
              description: 'Array of admin/manager users',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      count: { type: 'integer' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' },
                            email: { type: 'string' },
                            role: { type: 'string', enum: ['admin', 'manager'] },
                            tenantId: { type: 'string' },
                            isActive: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            403: { description: 'Forbidden — admin only' },
          },
        },
      },
      '/api/auth/managers/{id}/deactivate': {
        patch: {
          tags: ['Auth'],
          summary: 'Deactivate a manager account',
          description: '**Admin only.** Sets `isActive = false`. The account cannot log in but is not deleted.',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' }, example: 2 }],
          responses: {
            200: { description: 'Account deactivated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
            400: { description: 'Cannot deactivate your own account' },
            403: { description: 'Forbidden — admin only' },
            404: { description: 'Account not found' },
          },
        },
      },
      '/api/auth/managers/{id}/activate': {
        patch: {
          tags: ['Auth'],
          summary: 'Reactivate a manager account',
          description: '**Admin only.** Sets `isActive = true`.',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' }, example: 2 }],
          responses: {
            200: { description: 'Account activated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
            403: { description: 'Forbidden — admin only' },
            404: { description: 'Account not found' },
          },
        },
      },
      '/api/auth/managers/{id}': {
        delete: {
          tags: ['Auth'],
          summary: 'Permanently delete a manager account',
          description: '**Admin only.** Irreversibly removes the account from the database.',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' }, example: 2 }],
          responses: {
            200: { description: 'Account deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
            400: { description: 'Cannot delete your own account' },
            403: { description: 'Forbidden — admin only' },
            404: { description: 'Account not found' },
          },
        },
      },

      // ── Public Tenants ─────────────────────────────────────────────────────────
      '/api/tenants': {
        get: {
          tags: ['Organizations (public)'],
          summary: 'List all active organizations',
          description: 'Public endpoint — no auth required.',
          security: [],
          responses: {
            200: {
              description: 'List of active organizations',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      count: { type: 'integer' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Tenant' } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Organizations (public)'],
          summary: 'Create organization (admin only)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TenantInput' } } },
          },
          responses: {
            201: { description: 'Organization created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } } },
            403: { description: 'Forbidden — admin only' },
            409: { description: 'Tenant ID already exists' },
          },
        },
      },

      // ── Manager — Organizations ────────────────────────────────────────────────
      '/api/manager/organizations': {
        get: {
          tags: ['Manager — Organizations'],
          summary: 'List all organizations',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Array of organizations', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, count: { type: 'integer' }, data: { type: 'array', items: { $ref: '#/components/schemas/Tenant' } } } } } } },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden — admin/manager only' },
          },
        },
        post: {
          tags: ['Manager — Organizations'],
          summary: 'Create a new organization',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TenantInput' } } },
          },
          responses: {
            201: { description: 'Organization created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } } },
            409: { description: 'Organization ID already exists' },
          },
        },
      },
      '/api/manager/organizations/{tenantId}': {
        put: {
          tags: ['Manager — Organizations'],
          summary: 'Update an organization',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tenantId', required: true, schema: { type: 'string' }, example: 'SCHOOL_01' }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['SCHOOL', 'HOSPITAL', 'BUSINESS'] },
                    contactEmail: { type: 'string', format: 'email' },
                    logoUrl: { type: 'string', nullable: true },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Updated organization', content: { 'application/json': { schema: { $ref: '#/components/schemas/Tenant' } } } },
            404: { description: 'Organization not found' },
          },
        },
        delete: {
          tags: ['Manager — Organizations'],
          summary: 'Deactivate an organization (admin only)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tenantId', required: true, schema: { type: 'string' }, example: 'SCHOOL_01' }],
          responses: {
            200: { description: 'Organization deactivated', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
            403: { description: 'Forbidden — admin only' },
            404: { description: 'Organization not found' },
          },
        },
      },

      // ── Manager — Cards ────────────────────────────────────────────────────────
      '/api/manager/organizations/{tenantId}/cards': {
        get: {
          tags: ['Manager — Cards'],
          summary: 'List all card holders in an organization',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tenantId', required: true, schema: { type: 'string' }, example: 'SCHOOL_01' }],
          responses: {
            200: { description: 'Array of cards', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, count: { type: 'integer' }, data: { type: 'array', items: { $ref: '#/components/schemas/Card' } }, tenant: { $ref: '#/components/schemas/Tenant' } } } } } },
            404: { description: 'Organization not found' },
          },
        },
        post: {
          tags: ['Manager — Cards'],
          summary: 'Add a card holder to an organization',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tenantId', required: true, schema: { type: 'string' }, example: 'SCHOOL_01' }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CardInput' } } },
          },
          responses: {
            201: { description: 'Card holder created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Card' } } } },
            404: { description: 'Organization not found or inactive' },
            409: { description: 'Tag ID already registered' },
          },
        },
      },
      '/api/manager/organizations/{tenantId}/cards/{cardId}': {
        put: {
          tags: ['Manager — Cards'],
          summary: 'Update a card holder',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'tenantId', required: true, schema: { type: 'string' }, example: 'SCHOOL_01' },
            { in: 'path', name: 'cardId', required: true, schema: { type: 'integer' }, example: 1 },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    profileImageUrl: { type: 'string', nullable: true },
                    metadata: { $ref: '#/components/schemas/CardInput/properties/metadata' },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Card holder updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Card' } } } },
            404: { description: 'Card holder not found' },
          },
        },
        delete: {
          tags: ['Manager — Cards'],
          summary: 'Remove a card holder',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'tenantId', required: true, schema: { type: 'string' }, example: 'SCHOOL_01' },
            { in: 'path', name: 'cardId', required: true, schema: { type: 'integer' }, example: 1 },
          ],
          responses: {
            200: { description: 'Card holder removed', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessMessage' } } } },
            404: { description: 'Card holder not found' },
          },
        },
      },
      '/api/manager/organizations/{tenantId}/export': {
        get: {
          tags: ['Manager — Cards'],
          summary: 'Export all active cards data for a ZIP download',
          description: 'Returns full card + organization data used by the frontend to generate card images and bundle them into a ZIP.',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tenantId', required: true, schema: { type: 'string' }, example: 'SCHOOL_01' }],
          responses: {
            200: {
              description: 'Export payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          organization: { $ref: '#/components/schemas/Tenant' },
                          cards: { type: 'array', items: { $ref: '#/components/schemas/Card' } },
                          exportedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
            404: { description: 'Organization not found' },
          },
        },
      },

      // ── Legacy Cards ───────────────────────────────────────────────────────────
      '/api/cards': {
        get: {
          tags: ['Cards (legacy)'],
          summary: 'List cards for the authenticated user\'s tenant',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Array of cards' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Cards (legacy)'],
          summary: 'Register a new NFC card',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tagId', 'businessUrl'],
                  properties: {
                    tagId: { type: 'string', example: 'NEWTAG01' },
                    businessUrl: { type: 'string', example: 'https://mysite.com' },
                    metadata: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Card registered' },
            409: { description: 'Tag ID already exists' },
          },
        },
      },
      '/api/cards/{tagId}': {
        get: {
          tags: ['Cards (legacy)'],
          summary: 'Get a card by tag ID',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tagId', required: true, schema: { type: 'string' }, example: 'STUDENT001' }],
          responses: {
            200: { description: 'Card data' },
            404: { description: 'Card not found' },
          },
        },
        put: {
          tags: ['Cards (legacy)'],
          summary: 'Update a card',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tagId', required: true, schema: { type: 'string' }, example: 'STUDENT001' }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    businessUrl: { type: 'string' },
                    metadata: { type: 'object' },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Card updated' },
            404: { description: 'Card not found' },
          },
        },
        delete: {
          tags: ['Cards (legacy)'],
          summary: 'Deactivate a card',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tagId', required: true, schema: { type: 'string' }, example: 'STUDENT001' }],
          responses: {
            200: { description: 'Card deactivated' },
            404: { description: 'Card not found' },
          },
        },
      },
      '/api/cards/{tagId}/analytics': {
        get: {
          tags: ['Cards (legacy)'],
          summary: 'Get tap analytics for a card',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'tagId', required: true, schema: { type: 'string' }, example: 'STUDENT001' }],
          responses: {
            200: { description: 'Analytics data' },
            404: { description: 'Card not found' },
          },
        },
      },

      // ── Upload ─────────────────────────────────────────────────────────────────
      '/api/upload/profile': {
        post: {
          tags: ['Upload'],
          summary: 'Upload a profile photo',
          description: 'Returns the server path of the uploaded image to store in `profileImageUrl`.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['image'],
                  properties: {
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Upload successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadResponse' } } } },
            400: { description: 'No file or invalid file type' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden — admin/manager only' },
          },
        },
      },
      '/api/upload/logo': {
        post: {
          tags: ['Upload'],
          summary: 'Upload an organization logo',
          description: 'Returns the server path of the uploaded logo to store in `logoUrl`.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['image'],
                  properties: {
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Upload successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/UploadResponse' } } } },
            400: { description: 'No file or invalid file type' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden — admin/manager only' },
          },
        },
      },

      // ── NFC Redirect ────────────────────────────────────────────────────────────
      '/t/{tagId}': {
        get: {
          tags: ['NFC Redirect'],
          summary: 'NFC tap redirect',
          description: 'Looks up the card by tag ID, increments the tap counter, and redirects to `businessUrl`. This is the URL encoded on the physical NFC chip.',
          security: [],
          parameters: [{ in: 'path', name: 'tagId', required: true, schema: { type: 'string' }, example: 'STUDENT001' }],
          responses: {
            302: { description: 'Redirect to card\'s businessUrl' },
            404: { description: 'Tag not registered (returns HTML error page)' },
          },
        },
      },
    },
  },
  apis: [], // all paths are defined inline above
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
