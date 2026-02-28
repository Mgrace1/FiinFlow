import swaggerJsdoc from 'swagger-jsdoc';
import { Request, Response } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FinFlow API Documentation',
      version: '1.0.0',
      description: 'Comprehensive API documentation for FinFlow - Financial Management System for SMEs',
      contact: {
        name: 'FinFlow Support',
        email: 'support@finflow.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
      {
        url: 'http://localhost:5173',
        description: 'Frontend server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Company: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Acme Corporation' },
            email: { type: 'string', example: 'admin@acme.com' },
            address: { type: 'string', example: '123 Business St, Kigali, Rwanda' },
            phone: { type: 'string', example: '+250788123456' },
            industry: { type: 'string', example: 'Technology' },
            logoUrl: { type: 'string', example: 'https://example.com/logo.png' },
            defaultCurrency: { type: 'string', example: 'RWF' },
            exchangeRateUSD: { type: 'number', example: 1300 },
            taxRate: { type: 'number', example: 18 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            phone: { type: 'string', example: '+250788123456' },
            role: { type: 'string', enum: ['admin', 'finance_manager', 'staff'], example: 'admin' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Client: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'ABC Ltd' },
            email: { type: 'string', example: 'contact@abc.com' },
            phone: { type: 'string', example: '+250788123456' },
            address: { type: 'string', example: '456 Client Ave, Kigali, Rwanda' },
            tin: { type: 'string', example: '123456789' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            clientId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            invoiceNumber: { type: 'string', example: 'INV-2024-001' },
            issueDate: { type: 'string', format: 'date', example: '2024-01-15' },
            dueDate: { type: 'string', format: 'date', example: '2024-02-15' },
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], example: 'sent' },
            currency: { type: 'string', example: 'RWF' },
            subtotal: { type: 'number', example: 1000000 },
            taxAmount: { type: 'number', example: 180000 },
            total: { type: 'number', example: 1180000 },
            pdfUrl: { type: 'string', example: 'https://example.com/invoice.pdf' },
            notes: { type: 'string', example: 'Payment due within 30 days' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            clientId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            category: { type: 'string', example: 'Office Supplies' },
            amount: { type: 'number', example: 50000 },
            currency: { type: 'string', example: 'RWF' },
            date: { type: 'string', format: 'date', example: '2024-01-15' },
            description: { type: 'string', example: 'Purchased office equipment' },
            receiptUrl: { type: 'string', example: 'https://example.com/receipt.pdf' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            type: { type: 'string', enum: ['user_signup', 'invoice_overdue', 'invoice_paid', 'invoice_sent', 'budget_exceeded'], example: 'invoice_overdue' },
            title: { type: 'string', example: 'Invoice Overdue' },
            message: { type: 'string', example: 'Invoice INV-2024-001 is now overdue' },
            isRead: { type: 'boolean', example: false },
            relatedInvoiceId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            relatedUserId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'Authentication endpoints' },
      { name: 'Companies', description: 'Company management endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Clients', description: 'Client management endpoints' },
      { name: 'Invoices', description: 'Invoice management endpoints' },
      { name: 'Expenses', description: 'Expense management endpoints' },
      { name: 'Notifications', description: 'Notification endpoints' },
      { name: 'Files', description: 'File upload endpoints' },
      { name: 'Dashboard', description: 'Dashboard statistics endpoints' },
    ],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login to company workspace',
          description: 'Authenticate user with email, password, and company ID',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'companyId'],
                  properties: {
                    email: { type: 'string', example: 'admin@acme.com' },
                    password: { type: 'string', example: 'your-password' },
                    companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Login successful' },
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                          user: { $ref: '#/components/schemas/User' },
                          company: { $ref: '#/components/schemas/Company' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Invalid credentials or missing fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/companies': {
        post: {
          tags: ['Companies'],
          summary: 'Create new company',
          description: 'Create a new company and automatically create an admin user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'address', 'phone'],
                  properties: {
                    name: { type: 'string', example: 'Acme Corporation' },
                    email: { type: 'string', example: 'admin@acme.com' },
                    address: { type: 'string', example: '123 Business St, Kigali, Rwanda' },
                    phone: { type: 'string', example: '+250788123456' },
                    industry: { type: 'string', example: 'Technology' },
                    defaultCurrency: { type: 'string', example: 'RWF' },
                    exchangeRateUSD: { type: 'number', example: 1300 },
                    taxRate: { type: 'number', example: 18 },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Company created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Company created successfully' },
                      data: {
                        type: 'object',
                        properties: {
                          companyId: { type: 'string', example: '507f1f77bcf86cd799439011' },
                          companyName: { type: 'string', example: 'Acme Corporation' },
                          loginUrl: { type: 'string', example: 'http://localhost:5173/company/507f1f77bcf86cd799439011/login' },
                          adminEmail: { type: 'string', example: 'admin@acme.com' },
                          adminTemporaryPassword: { type: 'string', example: 'aB3dE5gH9kL2' },
                        },
                      },
                    },
                  },
                },
              },
            },
            400: { description: 'Missing required fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Company name or email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            500: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        get: {
          tags: ['Companies'],
          summary: 'Get company details',
          description: 'Get authenticated company details',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Company details retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Company' },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/users': {
        post: {
          tags: ['Users'],
          summary: 'Create new user',
          description: 'Create a new user within the company',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password', 'role'],
                  properties: {
                    name: { type: 'string', example: 'Jane Smith' },
                    email: { type: 'string', example: 'jane@acme.com' },
                    password: { type: 'string', example: 'securePassword123' },
                    phone: { type: 'string', example: '+250788123456' },
                    role: { type: 'string', enum: ['admin', 'finance_manager', 'staff'], example: 'staff' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'User created successfully' },
                      data: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            400: { description: 'Missing required fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        get: {
          tags: ['Users'],
          summary: 'Get all users',
          description: 'Get all users in the company',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Users retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get dashboard statistics',
          description: 'Get comprehensive dashboard statistics including revenue, expenses, invoices, and clients',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Dashboard statistics retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          totalRevenue: { type: 'number', example: 5000000 },
                          totalExpenses: { type: 'number', example: 2000000 },
                          netProfit: { type: 'number', example: 3000000 },
                          invoicesPaid: { type: 'number', example: 45 },
                          invoicesPending: { type: 'number', example: 12 },
                          totalClients: { type: 'number', example: 28 },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

// Swagger UI setup handler
export const swaggerUiHandler = (_req: Request, res: Response) =>{
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
};
