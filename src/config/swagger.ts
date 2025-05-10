import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KDrive API',
      version: '1.0.0',
      description: 'API de gestion de fichiers et dossiers KDrive',
    },
    servers: [
      {
        url: '/api',
        description: 'Serveur API',
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
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message d\'erreur',
            },
          },
        },
        CreateFolderRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nom du dossier',
            },
            parentId: {
              type: 'integer',
              nullable: true,
              description: 'ID du dossier parent (null pour un dossier racine)',
            },
          },
          required: ['name'],
        },
        CreateFolderResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID du dossier créé',
            },
          },
        },
        FolderContentsResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID du dossier',
            },
            name: {
              type: 'string',
              description: 'Nom du dossier',
            },
            contents: {
              type: 'object',
              properties: {
                folders: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'integer',
                      },
                      name: {
                        type: 'string',
                      },
                    },
                  },
                },
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'integer',
                      },
                      name: {
                        type: 'string',
                      },
                      size: {
                        type: 'integer',
                      },
                      mimeType: {
                        type: 'string',
                      },
                      updatedAt: {
                        type: 'string',
                        format: 'date-time',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        RootFoldersResponse: {
          type: 'object',
          properties: {
            folders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                  },
                  name: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/controllers/*.ts', './src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
